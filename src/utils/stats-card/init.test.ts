import { describe, expect, it, vi } from 'vitest'

// Mock WASM modules
vi.mock('@cf-wasm/resvg/workerd', () => ({
	Resvg: {
		async: vi.fn().mockResolvedValue({
			render: () => ({
				asPng: () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
			}),
		}),
	},
}))

vi.mock('@cf-wasm/satori/workerd', () => ({
	satori: vi.fn().mockResolvedValue('<svg></svg>'),
}))

import { satori, svgToPng } from './init'

describe('init', () => {
	describe('svgToPng', () => {
		it('converts SVG string to PNG Uint8Array', async () => {
			const svg = '<svg width="100" height="100"></svg>'
			const result = await svgToPng(svg)

			expect(result).toBeInstanceOf(Uint8Array)
			expect(result.length).toBeGreaterThan(0)
		})

		it('returns PNG magic bytes', async () => {
			const svg = '<svg></svg>'
			const result = await svgToPng(svg)

			// PNG magic number: 0x89 0x50 0x4E 0x47
			expect(result[0]).toBe(0x89)
			expect(result[1]).toBe(0x50)
			expect(result[2]).toBe(0x4e)
			expect(result[3]).toBe(0x47)
		})
	})

	describe('satori', () => {
		it('is exported from cf-wasm', () => {
			expect(satori).toBeDefined()
			expect(typeof satori).toBe('function')
		})
	})
})
