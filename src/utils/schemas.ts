import { z } from '@hono/zod-openapi'

export const ErrorResponseSchema = z
	.object({
		message: z.string(),
	})
	.openapi('ErrorResponse')

export const PaginationQuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.default(10)
			.openapi({ description: 'Number of results' }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.default(0)
			.openapi({ description: 'Offset for pagination' }),
	})
	.openapi('PaginationQuery')
