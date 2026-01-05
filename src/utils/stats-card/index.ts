import { createStatsCard } from './components'
import { satori, svgToPng } from './init'
import type { StatsCardData } from './types'

// フォントキャッシュ
let fontCache: ArrayBuffer | null = null

// フォント取得
async function loadFont(): Promise<ArrayBuffer> {
	if (fontCache) return fontCache

	// Inter font TTF from Fontsource (jsdelivr CDN)
	// satori requires TTF/OTF format, not WOFF2
	const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf')
	fontCache = await fontResponse.arrayBuffer()
	return fontCache
}

// PNG画像を生成
export async function generateStatsCard(data: StatsCardData): Promise<Uint8Array> {
	const font = await loadFont()

	const svg = await satori(createStatsCard(data), {
		width: 825,
		height: 620,
		fonts: [
			{
				name: 'Inter',
				data: font,
				weight: 400,
				style: 'normal',
			},
			{
				name: 'Inter',
				data: font,
				weight: 700,
				style: 'normal',
			},
		],
	})

	const png = await svgToPng(svg)

	return png
}

export type { MatchHistoryItem, RatingHistoryPoint } from './types'
