import { describe, expect, it } from 'vitest'
import {
	calculateExpectedScore,
	calculateNewRating,
	calculateTeamAverageRating,
	formatRankDisplay,
	getRankDisplay,
	INITIAL_RATING,
	isInPlacement,
	K_FACTOR_NORMAL,
	K_FACTOR_PLACEMENT,
	PLACEMENT_GAMES,
} from '../elo'

describe('Elo Rating Utilities', () => {
	describe('calculateExpectedScore', () => {
		it('同じレーティングの場合、期待勝率は0.5', () => {
			const expected = calculateExpectedScore(1500, 1500)
			expect(expected).toBeCloseTo(0.5, 2)
		})

		it('自分が高レートの場合、期待勝率は0.5より大きい', () => {
			const expected = calculateExpectedScore(1700, 1500)
			expect(expected).toBeGreaterThan(0.5)
		})

		it('自分が低レートの場合、期待勝率は0.5より小さい', () => {
			const expected = calculateExpectedScore(1300, 1500)
			expect(expected).toBeLessThan(0.5)
		})

		it('400差で期待勝率は約0.91', () => {
			const expected = calculateExpectedScore(1900, 1500)
			expect(expected).toBeCloseTo(0.91, 1)
		})
	})

	describe('calculateNewRating', () => {
		it('同レート同士で勝利 - K_FACTOR_NORMAL分上昇', () => {
			const newRating = calculateNewRating(1500, 1500, true, false)
			expect(newRating).toBe(1500 + K_FACTOR_NORMAL / 2)
		})

		it('同レート同士で敗北 - K_FACTOR_NORMAL分下降', () => {
			const newRating = calculateNewRating(1500, 1500, false, false)
			expect(newRating).toBe(1500 - K_FACTOR_NORMAL / 2)
		})

		it('プレイスメント中はK_FACTOR_PLACEMENTを使用', () => {
			const newRating = calculateNewRating(1500, 1500, true, true)
			expect(newRating).toBe(1500 + K_FACTOR_PLACEMENT / 2)
		})

		it('レーティングは0未満にならない', () => {
			const newRating = calculateNewRating(10, 1500, false, false)
			expect(newRating).toBeGreaterThanOrEqual(0)
		})

		it('高レートが低レートに勝利 - 変動は小さい', () => {
			const change = calculateNewRating(1700, 1300, true, false) - 1700
			expect(change).toBeLessThan(K_FACTOR_NORMAL / 2)
		})

		it('低レートが高レートに勝利 - 変動は大きい', () => {
			const change = calculateNewRating(1300, 1700, true, false) - 1300
			expect(change).toBeGreaterThan(K_FACTOR_NORMAL / 2)
		})
	})

	describe('calculateTeamAverageRating', () => {
		it('メンバーがいない場合はINITIAL_RATINGを返す', () => {
			const average = calculateTeamAverageRating([])
			expect(average).toBe(INITIAL_RATING)
		})

		it('1人の場合はその値を返す', () => {
			const average = calculateTeamAverageRating([1600])
			expect(average).toBe(1600)
		})

		it('複数人の平均を計算', () => {
			const average = calculateTeamAverageRating([1400, 1500, 1600])
			expect(average).toBe(1500)
		})

		it('小数点は四捨五入', () => {
			const average = calculateTeamAverageRating([1401, 1402, 1403])
			expect(average).toBe(1402)
		})
	})

	describe('getRankDisplay', () => {
		it('Iron IV - 最低ランク', () => {
			const rank = getRankDisplay(0)
			expect(rank.tier).toBe('Iron')
			expect(rank.division).toBe('IV')
			expect(rank.lp).toBe(0)
		})

		it('Bronze II - ティア内の中間', () => {
			const rank = getRankDisplay(1175)
			expect(rank.tier).toBe('Bronze')
			expect(rank.division).toBe('II')
			expect(rank.lp).toBeGreaterThanOrEqual(0)
			expect(rank.lp).toBeLessThanOrEqual(99)
		})

		it('Gold I - ティア内の最高ディビジョン', () => {
			const rank = getRankDisplay(1540)
			expect(rank.tier).toBe('Gold')
			expect(rank.division).toBe('I')
		})

		it('Master - ディビジョンなし', () => {
			const rank = getRankDisplay(2050)
			expect(rank.tier).toBe('Master')
			expect(rank.division).toBe('')
			expect(rank.lp).toBe(50)
		})

		it('Challenger - 最高ランク', () => {
			const rank = getRankDisplay(2500)
			expect(rank.tier).toBe('Challenger')
			expect(rank.division).toBe('')
			expect(rank.lp).toBe(200)
		})

		it('境界値 - Gold最大値', () => {
			const rank = getRankDisplay(1549)
			expect(rank.tier).toBe('Gold')
		})

		it('境界値 - Platinum最小値', () => {
			const rank = getRankDisplay(1550)
			expect(rank.tier).toBe('Platinum')
		})
	})

	describe('formatRankDisplay', () => {
		it('ディビジョンありのランクをフォーマット', () => {
			const formatted = formatRankDisplay({ tier: 'Gold', division: 'II', lp: 75 })
			expect(formatted).toBe('Gold II 75LP')
		})

		it('ディビジョンなしのランクをフォーマット', () => {
			const formatted = formatRankDisplay({ tier: 'Master', division: '', lp: 120 })
			expect(formatted).toBe('Master 120LP')
		})
	})

	describe('isInPlacement', () => {
		it('0試合はプレイスメント中', () => {
			expect(isInPlacement(0)).toBe(true)
		})

		it('プレイスメント試合数未満はプレイスメント中', () => {
			expect(isInPlacement(PLACEMENT_GAMES - 1)).toBe(true)
		})

		it('プレイスメント試合数到達で完了', () => {
			expect(isInPlacement(PLACEMENT_GAMES)).toBe(false)
		})

		it('プレイスメント試合数超過で完了', () => {
			expect(isInPlacement(PLACEMENT_GAMES + 10)).toBe(false)
		})
	})
})
