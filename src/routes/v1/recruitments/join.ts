import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { recruitmentParticipants, recruitments, users } from '@/db/schema'
import { JoinRecruitmentBodySchema, JoinResponseSchema, RecruitmentPathParamsSchema } from './schemas'

const joinRecruitmentRoute = createRoute({
	method: 'post',
	path: '/{id}/participants',
	tags: ['Recruitments'],
	summary: 'Join recruitment',
	description: 'Join a recruitment as a participant',
	request: {
		params: RecruitmentPathParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: JoinRecruitmentBodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Successfully joined recruitment',
			content: {
				'application/json': {
					schema: JoinResponseSchema,
				},
			},
		},
	},
})

export const joinRecruitmentRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	joinRecruitmentRoute,
	async (c) => {
		const { id } = c.req.valid('param')
		const { discordId, mainRole, subRole } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, id)).get()

		if (!recruitment) {
			throw new HTTPException(404, { message: 'Recruitment not found' })
		}

		if (recruitment.status !== 'open') {
			throw new HTTPException(400, { message: 'Recruitment is not open' })
		}

		const participantCount = await db
			.select({ count: count() })
			.from(recruitmentParticipants)
			.where(eq(recruitmentParticipants.recruitmentId, id))
			.get()

		const currentCount = participantCount?.count || 0
		const capacity = recruitment.capacity

		if (currentCount >= capacity) {
			throw new HTTPException(400, { message: 'Recruitment is full' })
		}

		const existing = await db
			.select()
			.from(recruitmentParticipants)
			.where(and(eq(recruitmentParticipants.recruitmentId, id), eq(recruitmentParticipants.discordId, discordId)))
			.get()

		if (existing) {
			throw new HTTPException(400, { message: 'Already joined' })
		}

		await db.insert(users).values({ discordId }).onConflictDoNothing()

		const participantId = crypto.randomUUID()
		await db.insert(recruitmentParticipants).values({
			id: participantId,
			recruitmentId: id,
			discordId,
			mainRole: mainRole || null,
			subRole: subRole || null,
		})

		const newCount = currentCount + 1
		const isFull = newCount >= capacity

		if (isFull) {
			await db.update(recruitments).set({ status: 'full' }).where(eq(recruitments.id, id))
		}

		return c.json(
			{
				participant: {
					discordId,
					mainRole: mainRole || null,
					subRole: subRole || null,
				},
				isFull,
				count: newCount,
			},
			201,
		)
	},
)
