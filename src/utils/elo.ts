import type { LolDivision, LolTier } from '@/constants/lol'
import { INITIAL_RATING, K_FACTOR_NORMAL, K_FACTOR_PLACEMENT, PLACEMENT_GAMES } from '@/constants/rating'

const DIVISION_POINT_RANGE = 100
const DIVISIONS_PER_TIER = 4
const ELO_BASE = 10
const ELO_DIVISOR = 400
const MIN_RATING = 0

interface Tier {
	readonly name: LolTier
	readonly min: number
	readonly max: number
	readonly divisions: number
}

const TIERS: readonly Tier[] = [
	{ name: 'IRON', min: 0, max: 399, divisions: DIVISIONS_PER_TIER },
	{ name: 'BRONZE', min: 400, max: 799, divisions: DIVISIONS_PER_TIER },
	{ name: 'SILVER', min: 800, max: 1199, divisions: DIVISIONS_PER_TIER },
	{ name: 'GOLD', min: 1200, max: 1599, divisions: DIVISIONS_PER_TIER },
	{ name: 'PLATINUM', min: 1600, max: 1999, divisions: DIVISIONS_PER_TIER },
	{ name: 'EMERALD', min: 2000, max: 2399, divisions: DIVISIONS_PER_TIER },
	{ name: 'DIAMOND', min: 2400, max: 2799, divisions: DIVISIONS_PER_TIER },
	{ name: 'MASTER', min: 2800, max: 3199, divisions: 0 },
	{ name: 'GRANDMASTER', min: 3200, max: 3599, divisions: 0 },
	{ name: 'CHALLENGER', min: 3600, max: Number.POSITIVE_INFINITY, divisions: 0 },
] as const

export interface RankDisplay {
	tier: LolTier
	division: LolDivision | null
	lp: number
}

/**
 * 期待勝率を計算（Eloレーティングシステム）
 * @param myRating 自分のレート
 * @param opponentRating 相手（チーム平均）のレート
 * @returns 期待勝率（0.0 - 1.0）
 */
export function calculateExpectedScore(myRating: number, opponentRating: number): number {
	return 1 / (1 + ELO_BASE ** ((opponentRating - myRating) / ELO_DIVISOR))
}

/**
 * 新しいレートを計算
 * @param currentRating 現在のレート
 * @param opponentAverageRating 相手チームの平均レート
 * @param won 勝利したかどうか
 * @param isPlacement プレイスメント中かどうか
 * @returns 新しいレート（最低値: 0）
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

	return Math.max(MIN_RATING, Math.round(newRating))
}

/**
 * チームの平均レートを計算
 * @param ratings チームメンバーのレート配列
 * @returns 平均レート（空配列の場合は初期レート）
 */
export function calculateTeamAverageRating(ratings: number[]): number {
	if (ratings.length === 0) {
		return INITIAL_RATING
	}
	const sum = ratings.reduce((acc, rating) => acc + rating, 0)
	return Math.round(sum / ratings.length)
}

/**
 * Division index を Division 文字列に変換
 * @param index Division index (0-3)
 * @returns Division 文字列 (IV, III, II, I)
 */
function getDivision(index: number): LolDivision {
	switch (index) {
		case 0:
			return 'IV'
		case 1:
			return 'III'
		case 2:
			return 'II'
		default:
			return 'I'
	}
}

/**
 * レートからランク表示を取得
 * @param rating レート値
 * @returns ランク表示オブジェクト（ティア、ディビジョン、LP）
 * @throws {Error} 無効なレート値の場合
 */
export function getRankDisplay(rating: number): RankDisplay {
	const tier = TIERS.find((t) => rating >= t.min && rating <= t.max)
	if (!tier) {
		throw new Error(`Invalid rating: ${rating}`)
	}

	const positionInTier = rating - tier.min

	if (tier.divisions === 0) {
		return { tier: tier.name, division: null, lp: positionInTier }
	}

	const divisionIndex = Math.floor(positionInTier / DIVISION_POINT_RANGE)
	const division = getDivision(divisionIndex)
	const lp = positionInTier % DIVISION_POINT_RANGE

	return { tier: tier.name, division, lp }
}

/**
 * ランク表示を文字列に変換
 * @param rankDisplay ランク表示オブジェクト
 * @returns フォーマットされたランク文字列（例: "Gold IV 50LP", "Master 200LP"）
 */
export function formatRankDisplay(rankDisplay: RankDisplay): string {
	const { tier, division, lp } = rankDisplay
	if (division === null) {
		return `${tier} ${lp}LP`
	}
	return `${tier} ${division} ${lp}LP`
}

/**
 * プレイスメント中かどうかを判定
 * @param placementGames 完了したプレイスメント試合数
 * @returns プレイスメント中の場合true
 */
export function isInPlacement(placementGames: number): boolean {
	return placementGames < PLACEMENT_GAMES
}
