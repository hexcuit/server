import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, count, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { LOL_ROLES, type LolRole, recruitmentParticipants, recruitments, users } from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { type DbVariables, dbMiddleware } from '@/middlewares/dbMiddleware'

// ========== スキーマ定義 ==========

const CreateRecruitmentSchema = z
	.object({
		id: z.uuid(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		creatorId: z.string(),
		type: z.enum(['normal', 'ranked']).default('normal'),
		anonymous: z.boolean(),
		startTime: z.string().optional(),
	})
	.openapi('CreateRecruitment')

const RoleSchema = z.enum(LOL_ROLES)

const JoinRecruitmentSchema = z
	.object({
		recruitmentId: z.uuid(),
		discordId: z.string(),
		mainRole: RoleSchema.optional(),
		subRole: RoleSchema.optional(),
	})
	.openapi('JoinRecruitment')

const LeaveRecruitmentSchema = z
	.object({
		recruitmentId: z.uuid(),
		discordId: z.string(),
	})
	.openapi('LeaveRecruitment')

// ========== レスポンススキーマ ==========

const ParticipantSchema = z
	.object({
		discordId: z.string(),
		mainRole: z.enum(LOL_ROLES).nullable(),
		subRole: z.enum(LOL_ROLES).nullable(),
	})
	.openapi('Participant')

const RecruitmentSchema = z
	.object({
		id: z.string(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		creatorId: z.string(),
		type: z.enum(['normal', 'ranked']),
		anonymous: z.boolean(),
		capacity: z.number(),
		startTime: z.string().nullable(),
		status: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.openapi('Recruitment')

const CreateRecruitmentResponseSchema = z
	.object({
		success: z.boolean(),
		recruitmentId: z.string(),
	})
	.openapi('CreateRecruitmentResponse')

const GetRecruitmentResponseSchema = z
	.object({
		recruitment: RecruitmentSchema,
		participants: z.array(
			z.object({
				id: z.string(),
				recruitmentId: z.string(),
				discordId: z.string(),
				mainRole: z.enum(LOL_ROLES).nullable(),
				subRole: z.enum(LOL_ROLES).nullable(),
				joinedAt: z.string(),
			}),
		),
		count: z.number(),
	})
	.openapi('GetRecruitmentResponse')

const JoinResponseSchema = z
	.object({
		success: z.boolean(),
		isFull: z.boolean(),
		count: z.number(),
		participants: z.array(ParticipantSchema),
	})
	.openapi('JoinResponse')

const LeaveResponseSchema = z
	.object({
		success: z.boolean(),
		count: z.number(),
		participants: z.array(ParticipantSchema),
	})
	.openapi('LeaveResponse')

const UpdateRoleResponseSchema = z
	.object({
		success: z.boolean(),
		participants: z.array(ParticipantSchema),
	})
	.openapi('UpdateRoleResponse')

const SuccessResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.openapi('DeleteRecruitmentResponse')

// ========== ルート定義 ==========

const createRecruitmentRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Recruitment'],
	summary: '募集作成',
	description: '新しい募集を作成します',
	request: {
		body: { content: { 'application/json': { schema: CreateRecruitmentSchema } } },
	},
	responses: {
		200: {
			description: '募集作成成功',
			content: { 'application/json': { schema: CreateRecruitmentResponseSchema } },
		},
	},
})

const getRecruitmentRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Recruitment'],
	summary: '募集取得',
	description: '募集の詳細情報を取得します',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: '募集情報の取得に成功',
			content: { 'application/json': { schema: GetRecruitmentResponseSchema } },
		},
	},
})

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

const leaveRecruitmentRoute = createRoute({
	method: 'post',
	path: '/leave',
	tags: ['Recruitment'],
	summary: 'キャンセル',
	description: '募集への参加をキャンセルします',
	request: {
		body: { content: { 'application/json': { schema: LeaveRecruitmentSchema } } },
	},
	responses: {
		200: {
			description: 'キャンセル成功',
			content: { 'application/json': { schema: LeaveResponseSchema } },
		},
	},
})

const updateRoleRoute = createRoute({
	method: 'post',
	path: '/update-role',
	tags: ['Recruitment'],
	summary: 'ロール更新',
	description: '参加者のロールを更新します',
	request: {
		body: { content: { 'application/json': { schema: JoinRecruitmentSchema } } },
	},
	responses: {
		200: {
			description: 'ロール更新成功',
			content: { 'application/json': { schema: UpdateRoleResponseSchema } },
		},
	},
})

const deleteRecruitmentRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Recruitment'],
	summary: '募集終了',
	description: '募集を終了し、物理削除します',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: '削除成功',
			content: { 'application/json': { schema: SuccessResponseSchema } },
		},
	},
})

// ========== ルーター ==========

export const recruitRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env; Variables: DbVariables }>()

recruitRouter.use(corsMiddleware)
recruitRouter.use(apiKeyMiddleware)
recruitRouter.use(dbMiddleware)

// 募集作成
recruitRouter.openapi(createRecruitmentRoute, async (c) => {
	const data = c.req.valid('json')
	const db = c.var.db

	await db.insert(users).values({ discordId: data.creatorId }).onConflictDoNothing()

	await db.insert(recruitments).values({
		id: data.id,
		guildId: data.guildId,
		channelId: data.channelId,
		messageId: data.messageId,
		creatorId: data.creatorId,
		type: data.type,
		anonymous: data.anonymous,
		startTime: data.startTime || null,
		status: 'open',
	})

	return c.json({ success: true, recruitmentId: data.id })
})

// 募集取得
recruitRouter.openapi(getRecruitmentRoute, async (c) => {
	const recruitmentId = c.req.valid('param').id
	const db = c.var.db

	const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

	if (!recruitment) {
		throw new HTTPException(404, { message: 'Recruitment not found' })
	}

	const participants = await db
		.select()
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))

	return c.json({
		recruitment,
		participants,
		count: participants.length,
	})
})

// 参加
recruitRouter.openapi(joinRecruitmentRoute, async (c) => {
	const { recruitmentId, discordId, mainRole, subRole } = c.req.valid('json')
	const db = c.var.db

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

// キャンセル
recruitRouter.openapi(leaveRecruitmentRoute, async (c) => {
	const { recruitmentId, discordId } = c.req.valid('json')
	const db = c.var.db

	const existing = await db
		.select()
		.from(recruitmentParticipants)
		.where(
			and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
		)
		.get()

	if (!existing) {
		throw new HTTPException(400, { message: 'Not joined' })
	}

	await db
		.delete(recruitmentParticipants)
		.where(
			and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
		)

	const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

	if (recruitment?.status === 'full') {
		await db.update(recruitments).set({ status: 'open' }).where(eq(recruitments.id, recruitmentId))
	}

	const participants = await db
		.select()
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))

	return c.json({
		success: true,
		count: participants.length,
		participants: participants.map((p) => ({
			discordId: p.discordId,
			mainRole: p.mainRole,
			subRole: p.subRole,
		})),
	})
})

// ロール更新
recruitRouter.openapi(updateRoleRoute, async (c) => {
	const { recruitmentId, discordId, mainRole, subRole } = c.req.valid('json')
	const db = c.var.db

	const existing = await db
		.select()
		.from(recruitmentParticipants)
		.where(
			and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
		)
		.get()

	if (!existing) {
		throw new HTTPException(400, { message: 'Not joined' })
	}

	const updateData: { mainRole?: LolRole | null; subRole?: LolRole | null } = {}
	if (mainRole !== undefined) updateData.mainRole = mainRole
	if (subRole !== undefined) updateData.subRole = subRole

	if (Object.keys(updateData).length > 0) {
		await db
			.update(recruitmentParticipants)
			.set(updateData)
			.where(
				and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
			)
	}

	const participants = await db
		.select()
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))

	return c.json({
		success: true,
		participants: participants.map((p) => ({
			discordId: p.discordId,
			mainRole: p.mainRole,
			subRole: p.subRole,
		})),
	})
})

// 募集終了（物理削除）
recruitRouter.openapi(deleteRecruitmentRoute, async (c) => {
	const recruitmentId = c.req.valid('param').id
	const db = c.var.db

	// CASCADE設定により recruitment_participants も自動削除される
	await db.delete(recruitments).where(eq(recruitments.id, recruitmentId))

	return c.json({ success: true })
})
