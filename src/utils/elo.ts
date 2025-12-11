// Eloレーティング計算ユーティリティ

// 定数
export const INITIAL_RATING = 1500
export const K_FACTOR_NORMAL = 32
export const K_FACTOR_PLACEMENT = 64
export const PLACEMENT_GAMES = 5

// ティア定義
export const TIERS = [
	{ name: 'Iron', min: 0, max: 1099, divisions: 4 },
	{ name: 'Bronze', min: 1100, max: 1249, divisions: 4 },
	{ name: 'Silver', min: 1250, max: 1399, divisions: 4 },
	{ name: 'Gold', min: 1400, max: 1549, divisions: 4 },
	{ name: 'Platinum', min: 1550, max: 1699, divisions: 4 },
	{ name: 'Emerald', min: 1700, max: 1849, divisions: 4 },
	{ name: 'Diamond', min: 1850, max: 1999, divisions: 4 },
	{ name: 'Master', min: 2000, max: 2149, divisions: 0 },
	{ name: 'Grandmaster', min: 2150, max: 2299, divisions: 0 },
	{ name: 'Challenger', min: 2300, max: Number.POSITIVE_INFINITY, divisions: 0 },
] as const

export type TierName = (typeof TIERS)[number]['name']
export type Division = 'IV' | 'III' | 'II' | 'I' | ''

export interface RankDisplay {
	tier: TierName
	division: Division
	lp: number
}

/**
 * 期待勝率を計算
 * @param myRating 自分のレート
 * @param opponentRating 相手（チーム平均）のレート
 */
export function calculateExpectedScore(myRating: number, opponentRating: number): number {
	return 1 / (1 + 10 ** ((opponentRating - myRating) / 400))
}

/**
 * 新しいレートを計算
 * @param currentRating 現在のレート
 * @param opponentAverageRating 相手チームの平均レート
 * @param won 勝利したかどうか
 * @param isPlacement プレイスメント中かどうか
 */
export function calculateNewRating(
	currentRating: number,
	opponentAverageRating: number,
	won: boolean,
	isPlacement: boolean,
): number {
	const kFactor = isPlacement ? K_FACTOR_PLACEMENT : K_FACTOR_NORMAL
	const expectedScore = calculateExpectedScore(currentRating, opponentAverageRating)
	const actualScore = won ? 1 : 0

	const newRating = currentRating + kFactor * (actualScore - expectedScore)

	// 最低0に制限
	return Math.max(0, Math.round(newRating))
}

/**
 * チームの平均レートを計算
 * @param ratings チームメンバーのレート配列
 */
export function calculateTeamAverageRating(ratings: number[]): number {
	if (ratings.length === 0) return INITIAL_RATING
	return Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length)
}

/**
 * レートからランク表示を取得
 * @param rating レート値
 */
export function getRankDisplay(rating: number): RankDisplay {
	// ティアを特定
	const tier = TIERS.find((t) => rating >= t.min && rating <= t.max)
	if (!tier) {
		// フォールバック（理論上到達しない）
		return { tier: 'Iron', division: 'IV', lp: 0 }
	}

	// Division無しのティア（Master以上）
	if (tier.divisions === 0) {
		const lp = rating - tier.min
		return { tier: tier.name, division: '', lp }
	}

	// ティア内の位置を計算
	const tierRange = tier.max - tier.min + 1
	const divisionRange = tierRange / tier.divisions
	const positionInTier = rating - tier.min

	// Division を特定（IV=0, III=1, II=2, I=3）
	const divisionIndex = Math.min(Math.floor(positionInTier / divisionRange), tier.divisions - 1)
	const divisions: Division[] = ['IV', 'III', 'II', 'I']
	const division = divisions[divisionIndex] ?? 'IV'

	// LP を計算（Division内の位置を0-99に正規化）
	const positionInDivision = positionInTier - divisionIndex * divisionRange
	const lp = Math.min(99, Math.floor((positionInDivision / divisionRange) * 100))

	return { tier: tier.name, division, lp }
}

/**
 * ランク表示を文字列に変換
 * @param rankDisplay ランク表示オブジェクト
 */
export function formatRankDisplay(rankDisplay: RankDisplay): string {
	if (rankDisplay.division === '') {
		return `${rankDisplay.tier} ${rankDisplay.lp}LP`
	}
	return `${rankDisplay.tier} ${rankDisplay.division} ${rankDisplay.lp}LP`
}

/**
 * プレイスメント中かどうかを判定
 * @param placementGames 完了したプレイスメント試合数
 */
export function isInPlacement(placementGames: number): boolean {
	return placementGames < PLACEMENT_GAMES
}
