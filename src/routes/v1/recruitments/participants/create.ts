import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { recruitmentParticipants, recruitments, users } from '@/db/schema'
import { RecruitmentPathParamsSchema } from '../schemas'
import { JoinRecruitmentBodySchema, JoinResponseSchema } from './schemas'

const createParticipantRoute = createRoute({
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

export const createParticipantRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	createParticipantRoute,
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

		const capacity = recruitment.capacity

		const existing = await db
			.select()
			.from(recruitmentParticipants)
			.where(and(eq(recruitmentParticipants.recruitmentId, id), eq(recruitmentParticipants.discordId, discordId)))
			.get()

		if (existing) {
			throw new HTTPException(400, { message: 'Already joined' })
		}

		await db.insert(users).values({ discordId }).onConflictDoNothing()

		// Use conditional INSERT to atomically check capacity and insert participant
		const participantId = crypto.randomUUID()
		const insertResult = await db.run(sql`
			INSERT INTO recruitment_participants (id, recruitment_id, discord_id, main_role, sub_role)
			SELECT ${participantId}, ${id}, ${discordId}, ${mainRole || null}, ${subRole || null}
			WHERE (SELECT COUNT(*) FROM recruitment_participants WHERE recruitment_id = ${id}) < ${capacity}
		`)

		if (insertResult.meta.changes === 0) {
			throw new HTTPException(400, { message: 'Recruitment is full' })
		}

		// Get updated count after successful insertion
		const participantCount = await db
			.select({ count: count() })
			.from(recruitmentParticipants)
			.where(eq(recruitmentParticipants.recruitmentId, id))
			.get()

		const newCount = participantCount?.count || 1
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
