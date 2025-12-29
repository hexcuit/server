import { Resvg } from '@cf-wasm/resvg/workerd'
import { satori } from '@cf-wasm/satori/workerd'

// cf-wasm は内部で WASM を管理するため、明示的な初期化は不要

export async function svgToPng(svg: string): Promise<Uint8Array> {
	const resvg = await Resvg.async(svg)
	const pngData = resvg.render().asPng()
	return pngData
}

export { satori }
