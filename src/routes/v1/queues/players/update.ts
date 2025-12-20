import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import type { LolRole } from '@/constants'
import { queuePlayers } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { PlayerPathParamsSchema, UpdateRoleBodySchema, UpdateRoleResponseSchema } from './schemas'

const route = createRoute({
	method: 'patch',
	path: '/v1/queues/{id}/players/{discordId}',
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
		404: {
			description: 'Player not found',
			content: {
				'application/json': {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { id, discordId } = c.req.valid('param')
	const { mainRole, subRole } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const existing = await db
		.select()
		.from(queuePlayers)
		.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
		.get()

	if (!existing) {
		return c.json({ message: 'Player not found' }, 404)
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

	return c.json(
		{
			player: {
				discordId,
				mainRole: updated?.mainRole || null,
				subRole: updated?.subRole || null,
			},
		},
		200,
	)
})

export default app
