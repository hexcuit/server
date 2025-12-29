import { createStatsCard } from './components'
import { satori, svgToPng } from './init'
import type { StatsCardData } from './types'

// フォントキャッシュ
let fontCache: ArrayBuffer | null = null

// フォント取得
async function loadFont(): Promise<ArrayBuffer> {
	if (fontCache) return fontCache

	console.log('Fetching font...')
	// Inter font TTF from Fontsource (jsdelivr CDN)
	// satori requires TTF/OTF format, not WOFF2
	const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf')
	fontCache = await fontResponse.arrayBuffer()
	console.log('Font fetched, size:', fontCache.byteLength)
	return fontCache
}

// PNG画像を生成
export async function generateStatsCard(data: StatsCardData): Promise<Uint8Array> {
	console.log('generateStatsCard called')

	const font = await loadFont()
	console.log('Font loaded')

	console.log('Creating SVG with satori...')
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
	console.log('SVG created, length:', svg.length)

	console.log('Converting SVG to PNG...')
	const png = await svgToPng(svg)
	console.log('PNG created, size:', png.length)

	return png
}

export type { MatchHistoryItem, RatingHistoryPoint, StatsCardData } from './types'
