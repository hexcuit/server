import { zValidator } from '@hono/zod-validator'
import { and, count, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod'
import { LOL_ROLES, type LolRole, recruitmentParticipants, recruitments, users } from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'

const CreateRecruitmentSchema = z.object({
	id: z.uuid(),
	guildId: z.string(),
	channelId: z.string(),
	messageId: z.string(),
	creatorId: z.string(),
	type: z.enum(['normal', 'ranked']).default('normal'),
	anonymous: z.boolean(),
	startTime: z.string().optional(),
})

const RoleSchema = z.enum(LOL_ROLES)

const JoinRecruitmentSchema = z.object({
	recruitmentId: z.uuid(),
	discordId: z.string(),
	mainRole: RoleSchema.optional(),
	subRole: RoleSchema.optional(),
})

const LeaveRecruitmentSchema = z.object({
	recruitmentId: z.uuid(),
	discordId: z.string(),
})

export const recruitRouter = new Hono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)

	// 募集作成
	.post('/', zValidator('json', CreateRecruitmentSchema), async (c) => {
		const data = c.req.valid('json')
		const db = drizzle(c.env.DB)

		// ユーザー存在確認・作成
		await db.insert(users).values({ discordId: data.creatorId }).onConflictDoNothing()

		await db.insert(recruitments).values({
			id: data.id,
			guildId: data.guildId,
			channelId: data.channelId,
			messageId: data.messageId,
			creatorId: data.creatorId,
			type: data.type,
			anonymous: data.anonymous ? 'true' : 'false',
			startTime: data.startTime || null,
			status: 'open',
		})

		return c.json({ success: true, recruitmentId: data.id })
	})

	// 募集取得
	.get('/:id', async (c) => {
		const recruitmentId = c.req.param('id')
		const db = drizzle(c.env.DB)

		const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

		if (!recruitment) {
			return c.json({ error: 'Recruitment not found' }, 404)
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
	.post('/join', zValidator('json', JoinRecruitmentSchema), async (c) => {
		const { recruitmentId, discordId, mainRole, subRole } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		// 募集存在確認
		const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

		if (!recruitment) {
			return c.json({ error: 'Recruitment not found' }, 404)
		}

		if (recruitment.status !== 'open') {
			return c.json({ error: 'Recruitment is not open' }, 400)
		}

		// 現在の参加者数確認
		const participantCount = await db
			.select({ count: count() })
			.from(recruitmentParticipants)
			.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))
			.get()

		const currentCount = participantCount?.count || 0
		const capacity = Number.parseInt(recruitment.capacity, 10)

		if (currentCount >= capacity) {
			return c.json({ error: 'Recruitment is full' }, 400)
		}

		// 重複参加チェック
		const existing = await db
			.select()
			.from(recruitmentParticipants)
			.where(
				and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
			)
			.get()

		if (existing) {
			return c.json({ error: 'Already joined' }, 400)
		}

		// ユーザー存在確認・作成
		await db.insert(users).values({ discordId }).onConflictDoNothing()

		// 参加登録
		const participantId = crypto.randomUUID()
		await db.insert(recruitmentParticipants).values({
			id: participantId,
			recruitmentId,
			discordId,
			mainRole: mainRole || null,
			subRole: subRole || null,
		})

		// 定員到達確認
		const newCount = currentCount + 1
		const isFull = newCount >= capacity

		if (isFull) {
			await db.update(recruitments).set({ status: 'full' }).where(eq(recruitments.id, recruitmentId))
		}

		// 最新の参加者リストを取得
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
	.post('/leave', zValidator('json', LeaveRecruitmentSchema), async (c) => {
		const { recruitmentId, discordId } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		// 参加確認
		const existing = await db
			.select()
			.from(recruitmentParticipants)
			.where(
				and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
			)
			.get()

		if (!existing) {
			return c.json({ error: 'Not joined' }, 400)
		}

		// 参加取消
		await db
			.delete(recruitmentParticipants)
			.where(
				and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
			)

		// 募集がfullだった場合、openに戻す
		const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

		if (recruitment?.status === 'full') {
			await db.update(recruitments).set({ status: 'open' }).where(eq(recruitments.id, recruitmentId))
		}

		// 現在の参加者数
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
	.post('/update-role', zValidator('json', JoinRecruitmentSchema), async (c) => {
		const { recruitmentId, discordId, mainRole, subRole } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		// 参加確認
		const existing = await db
			.select()
			.from(recruitmentParticipants)
			.where(
				and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
			)
			.get()

		if (!existing) {
			return c.json({ error: 'Not joined' }, 400)
		}

		// ロール更新（指定されたフィールドのみ更新）
		const updateData: { mainRole?: LolRole | null; subRole?: LolRole | null } = {}
		if (mainRole !== undefined) updateData.mainRole = mainRole
		if (subRole !== undefined) updateData.subRole = subRole

		if (Object.keys(updateData).length > 0) {
			await db
				.update(recruitmentParticipants)
				.set(updateData)
				.where(
					and(
						eq(recruitmentParticipants.recruitmentId, recruitmentId),
						eq(recruitmentParticipants.discordId, discordId),
					),
				)
		}

		// 最新の参加者リストを取得
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
	.delete('/:id', async (c) => {
		const recruitmentId = c.req.param('id')
		const db = drizzle(c.env.DB)

		// CASCADE設定により recruitment_participants も自動削除される
		await db.delete(recruitments).where(eq(recruitments.id, recruitmentId))

		return c.json({ success: true })
	})
