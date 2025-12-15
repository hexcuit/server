import { OpenAPIHono } from '@hono/zod-openapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { corsMiddleware } from '@/middlewares/corsMiddleware'

describe('corsMiddleware', () => {
	const allowedOrigin = 'https://example.com'
	const anotherAllowedOrigin = 'https://another.example.com'

	let env: { DB: D1Database; CORS_ORIGIN: string }
	let dispose: () => Promise<void>

	beforeAll(async () => {
		const proxy = await getPlatformProxy<{ DB: D1Database; CORS_ORIGIN: string }>({
			configPath: './wrangler.jsonc',
		})
		env = { ...proxy.env, CORS_ORIGIN: `${allowedOrigin},${anotherAllowedOrigin}` }
		dispose = proxy.dispose
	})

	afterAll(async () => {
		await dispose()
	})

	it('should accept requests from allowed origin', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(corsMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					Origin: allowedOrigin,
				},
			},
			env,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
		expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
	})

	it('should accept requests from second allowed origin', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(corsMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					Origin: anotherAllowedOrigin,
				},
			},
			env,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(anotherAllowedOrigin)
	})

	it('should not return CORS headers for disallowed origin', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(corsMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					Origin: 'https://malicious.com',
				},
			},
			env,
		)

		// Request is processed but CORS headers are not set
		expect(res.status).toBe(200)
		expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
	})

	it('should process requests without Origin header', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(corsMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		const res = await app.request(
			'/test',
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
	})

	it('should return 500 when CORS_ORIGIN env is empty', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(corsMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		// Set CORS_ORIGIN to empty string
		const envWithoutCors = { ...env, CORS_ORIGIN: '' }

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					Origin: allowedOrigin,
				},
			},
			envWithoutCors,
		)

		expect(res.status).toBe(500)

		const data = (await res.json()) as { error: string }
		expect(data.error).toBe('Server configuration error')
	})

	it('should return 500 when CORS_ORIGIN env is undefined', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(corsMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		// Remove CORS_ORIGIN
		const { CORS_ORIGIN: _, ...envWithoutCors } = env

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					Origin: allowedOrigin,
				},
			},
			envWithoutCors as { DB: D1Database; CORS_ORIGIN: string },
		)

		expect(res.status).toBe(500)

		const data = (await res.json()) as { error: string }
		expect(data.error).toBe('Server configuration error')
	})

	it('should parse CORS_ORIGIN correctly with whitespace', async () => {
		const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
			.use(corsMiddleware)
			.get('/test', (c) => c.json({ success: true }))

		// CORS_ORIGIN with whitespace
		const envWithSpaces = { ...env, CORS_ORIGIN: ` ${allowedOrigin} , ${anotherAllowedOrigin} ` }

		const res = await app.request(
			'/test',
			{
				method: 'GET',
				headers: {
					Origin: allowedOrigin,
				},
			},
			envWithSpaces,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
	})
})
