import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { recruitmentParticipants, recruitments, users } from '@/db/schema'
import { JoinRecruitmentSchema, JoinResponseSchema } from './schemas'

const joinRecruitmentRoute = createRoute({
	method: 'post',
	path: '/join',
	tags: ['Recruitment'],
	summary: '参加',
	description: '募集に参加します',
	request: {
		body: { content: { 'application/json': { schema: JoinRecruitmentSchema } } },
	},
	responses: {
		200: {
			description: '参加成功',
			content: { 'application/json': { schema: JoinResponseSchema } },
		},
	},
})

export const joinRecruitmentRouter = new OpenAPIHono<{
	Bindings: Cloudflare.Env
}>().openapi(joinRecruitmentRoute, async (c) => {
	const { recruitmentId, discordId, mainRole, subRole } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

	if (!recruitment) {
		throw new HTTPException(404, { message: 'Recruitment not found' })
	}

	if (recruitment.status !== 'open') {
		throw new HTTPException(400, { message: 'Recruitment is not open' })
	}

	const participantCount = await db
		.select({ count: count() })
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))
		.get()

	const currentCount = participantCount?.count || 0
	const capacity = recruitment.capacity

	if (currentCount >= capacity) {
		throw new HTTPException(400, { message: 'Recruitment is full' })
	}

	const existing = await db
		.select()
		.from(recruitmentParticipants)
		.where(
			and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
		)
		.get()

	if (existing) {
		throw new HTTPException(400, { message: 'Already joined' })
	}

	await db.insert(users).values({ discordId }).onConflictDoNothing()

	const participantId = crypto.randomUUID()
	await db.insert(recruitmentParticipants).values({
		id: participantId,
		recruitmentId,
		discordId,
		mainRole: mainRole || null,
		subRole: subRole || null,
	})

	const newCount = currentCount + 1
	const isFull = newCount >= capacity

	if (isFull) {
		await db.update(recruitments).set({ status: 'full' }).where(eq(recruitments.id, recruitmentId))
	}

	const participants = await db
		.select()
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))

	return c.json({
		success: true,
		isFull,
		count: newCount,
		participants: participants.map((p) => ({
			discordId: p.discordId,
			mainRole: p.mainRole,
			subRole: p.subRole,
		})),
	})
})
