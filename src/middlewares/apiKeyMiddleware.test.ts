import { OpenAPIHono } from '@hono/zod-openapi'
import { env } from '@test/setup'
import { describe, expect, it } from 'vitest'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'

describe('apiKeyMiddleware', () => {
	it('should pass with valid API key', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(apiKeyMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { success: boolean }
		expect(data.success).toBe(true)
	})

	it('should return 401 without API key', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(apiKeyMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		const res = await app.request(
			'/test',
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)

		const data = (await res.json()) as { error: string }
		expect(data.error).toBe('Unauthorized')
	})

	it('should return 401 with invalid API key', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(apiKeyMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					'x-api-key': 'wrong-api-key',
				},
			},
			env,
		)

		expect(res.status).toBe(401)

		const data = (await res.json()) as { error: string }
		expect(data.error).toBe('Unauthorized')
	})

	it('should return 500 when API_KEY env is empty', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(apiKeyMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		// empty API_KEY
		const envWithoutApiKey = { ...env, API_KEY: '' }

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			envWithoutApiKey,
		)

		expect(res.status).toBe(500)

		const data = (await res.json()) as { error: string }
		expect(data.error).toBe('Server configuration error')
	})

	it('should return 500 when API_KEY env is undefined', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(apiKeyMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		// delete API_KEY
		const { API_KEY: _, ...envWithoutApiKey } = env

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			envWithoutApiKey as typeof env,
		)

		expect(res.status).toBe(500)

		const data = (await res.json()) as { error: string }
		expect(data.error).toBe('Server configuration error')
	})
})
