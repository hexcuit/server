import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import type { LolRole } from '@/constants'
import { queuePlayers } from '@/db/schema'
import { PlayerPathParamsSchema, UpdateRoleBodySchema, UpdateRoleResponseSchema } from './schemas'

const updatePlayerRoute = createRoute({
	method: 'patch',
	path: '/{id}/players/{discordId}',
	tags: ['Queues'],
	summary: 'Update player role',
	description: 'Update the role of a player',
	request: {
		params: PlayerPathParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: UpdateRoleBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Role updated successfully',
			content: {
				'application/json': {
					schema: UpdateRoleResponseSchema,
				},
			},
		},
	},
})

export const updatePlayerRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	updatePlayerRoute,
	async (c) => {
		const { id, discordId } = c.req.valid('param')
		const { mainRole, subRole } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		const existing = await db
			.select()
			.from(queuePlayers)
			.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
			.get()

		if (!existing) {
			throw new HTTPException(404, { message: 'Player not found' })
		}

		const updateData: { mainRole?: LolRole | null; subRole?: LolRole | null } = {}
		if (mainRole !== undefined) updateData.mainRole = mainRole
		if (subRole !== undefined) updateData.subRole = subRole

		if (Object.keys(updateData).length > 0) {
			await db
				.update(queuePlayers)
				.set(updateData)
				.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
		}

		const updated = await db
			.select()
			.from(queuePlayers)
			.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
			.get()

		return c.json({
			player: {
				discordId,
				mainRole: updated?.mainRole || null,
				subRole: updated?.subRole || null,
			},
		})
	},
)
