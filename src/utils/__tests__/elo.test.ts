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
	describe('定数', () => {
		it('初期レートは1200 (Gold IV 0LP)', () => {
			expect(INITIAL_RATING).toBe(1200)
		})

		it('通常K-Factorは32', () => {
			expect(K_FACTOR_NORMAL).toBe(32)
		})

		it('プレイスメントK-Factorは64', () => {
			expect(K_FACTOR_PLACEMENT).toBe(64)
		})

		it('プレイスメント試合数は5', () => {
			expect(PLACEMENT_GAMES).toBe(5)
		})
	})

	describe('calculateExpectedScore', () => {
		it('同じレーティングの場合、期待勝率は0.5', () => {
			expect(calculateExpectedScore(1200, 1200)).toBeCloseTo(0.5, 5)
		})

		it('自分が400高い場合、期待勝率は約0.909', () => {
			expect(calculateExpectedScore(1600, 1200)).toBeCloseTo(0.909, 2)
		})

		it('自分が400低い場合、期待勝率は約0.091', () => {
			expect(calculateExpectedScore(800, 1200)).toBeCloseTo(0.091, 2)
		})
	})

	describe('calculateNewRating', () => {
		it('同レート同士で勝利 → +16', () => {
			expect(calculateNewRating(1200, 1200, true, false)).toBe(1216)
		})

		it('同レート同士で敗北 → -16', () => {
			expect(calculateNewRating(1200, 1200, false, false)).toBe(1184)
		})

		it('プレイスメント中は変動が大きい (+32/-32)', () => {
			expect(calculateNewRating(1200, 1200, true, true)).toBe(1232)
			expect(calculateNewRating(1200, 1200, false, true)).toBe(1168)
		})

		it('高レート vs 低レート: 勝っても小さい上昇、負けると大きい下降', () => {
			expect(calculateNewRating(1600, 1200, true, false)).toBe(1603)
			expect(calculateNewRating(1600, 1200, false, false)).toBe(1571)
		})

		it('低レート vs 高レート: 勝つと大きい上昇、負けても小さい下降', () => {
			expect(calculateNewRating(800, 1200, true, false)).toBe(829)
			expect(calculateNewRating(800, 1200, false, false)).toBe(797)
		})

		it('レーティングは0未満にならない', () => {
			expect(calculateNewRating(10, 10, false, false)).toBe(0)
		})
	})

	describe('calculateTeamAverageRating', () => {
		it('空配列はINITIAL_RATINGを返す', () => {
			expect(calculateTeamAverageRating([])).toBe(INITIAL_RATING)
		})

		it('複数人の平均を計算（四捨五入）', () => {
			expect(calculateTeamAverageRating([1100, 1200, 1300])).toBe(1200)
			expect(calculateTeamAverageRating([1201, 1202])).toBe(1202)
		})
	})

	describe('getRankDisplay', () => {
		describe('エラーケース', () => {
			it('負のレーティングはエラー', () => {
				expect(() => getRankDisplay(-1)).toThrow('Invalid rating: -1')
			})
		})

		describe('ティア境界', () => {
			it('0 → Iron IV 0LP', () => {
				expect(getRankDisplay(0)).toEqual({ tier: 'Iron', division: 'IV', lp: 0 })
			})

			it('399 → Iron I 99LP', () => {
				expect(getRankDisplay(399)).toEqual({ tier: 'Iron', division: 'I', lp: 99 })
			})

			it('400 → Bronze IV 0LP', () => {
				expect(getRankDisplay(400)).toEqual({ tier: 'Bronze', division: 'IV', lp: 0 })
			})

			it('1199 → Silver I 99LP', () => {
				expect(getRankDisplay(1199)).toEqual({ tier: 'Silver', division: 'I', lp: 99 })
			})

			it('1200 → Gold IV 0LP (初期レート)', () => {
				expect(getRankDisplay(1200)).toEqual({ tier: 'Gold', division: 'IV', lp: 0 })
			})

			it('2799 → Diamond I 99LP', () => {
				expect(getRankDisplay(2799)).toEqual({ tier: 'Diamond', division: 'I', lp: 99 })
			})

			it('2800 → Master 0LP', () => {
				expect(getRankDisplay(2800)).toEqual({ tier: 'Master', division: null, lp: 0 })
			})
		})

		describe('Division境界 (Goldで代表)', () => {
			it('1299 → Gold IV 99LP', () => {
				expect(getRankDisplay(1299)).toEqual({ tier: 'Gold', division: 'IV', lp: 99 })
			})

			it('1300 → Gold III 0LP', () => {
				expect(getRankDisplay(1300)).toEqual({ tier: 'Gold', division: 'III', lp: 0 })
			})

			it('1400 → Gold II 0LP', () => {
				expect(getRankDisplay(1400)).toEqual({ tier: 'Gold', division: 'II', lp: 0 })
			})

			it('1500 → Gold I 0LP', () => {
				expect(getRankDisplay(1500)).toEqual({ tier: 'Gold', division: 'I', lp: 0 })
			})

			it('1599 → Gold I 99LP', () => {
				expect(getRankDisplay(1599)).toEqual({ tier: 'Gold', division: 'I', lp: 99 })
			})
		})

		describe('Master以上 (ディビジョンなし)', () => {
			it('Master: LP = rating - 2800', () => {
				expect(getRankDisplay(3000)).toEqual({ tier: 'Master', division: null, lp: 200 })
			})

			it('3200 → Grandmaster 0LP', () => {
				expect(getRankDisplay(3200)).toEqual({ tier: 'Grandmaster', division: null, lp: 0 })
			})

			it('3600 → Challenger 0LP', () => {
				expect(getRankDisplay(3600)).toEqual({ tier: 'Challenger', division: null, lp: 0 })
			})

			it('Challenger: LP上限なし', () => {
				expect(getRankDisplay(4000)).toEqual({ tier: 'Challenger', division: null, lp: 400 })
			})
		})
	})

	describe('formatRankDisplay', () => {
		it('ディビジョンあり', () => {
			expect(formatRankDisplay({ tier: 'Gold', division: 'IV', lp: 0 })).toBe('Gold IV 0LP')
		})

		it('ディビジョンなし', () => {
			expect(formatRankDisplay({ tier: 'Master', division: null, lp: 120 })).toBe('Master 120LP')
		})
	})

	describe('isInPlacement', () => {
		it('5試合未満はプレイスメント中', () => {
			expect(isInPlacement(0)).toBe(true)
			expect(isInPlacement(4)).toBe(true)
		})

		it('5試合以上はプレイスメント完了', () => {
			expect(isInPlacement(5)).toBe(false)
			expect(isInPlacement(10)).toBe(false)
		})
	})
})
