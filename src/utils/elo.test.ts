import { describe, expect, it } from 'bun:test'
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
} from './elo'

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
			it('0 → IRON IV 0LP', () => {
				expect(getRankDisplay(0)).toEqual({ tier: 'IRON', division: 'IV', lp: 0 })
			})

			it('399 → IRON I 99LP', () => {
				expect(getRankDisplay(399)).toEqual({ tier: 'IRON', division: 'I', lp: 99 })
			})

			it('400 → BRONZE IV 0LP', () => {
				expect(getRankDisplay(400)).toEqual({ tier: 'BRONZE', division: 'IV', lp: 0 })
			})

			it('1199 → SILVER I 99LP', () => {
				expect(getRankDisplay(1199)).toEqual({ tier: 'SILVER', division: 'I', lp: 99 })
			})

			it('1200 → GOLD IV 0LP (初期レート)', () => {
				expect(getRankDisplay(1200)).toEqual({ tier: 'GOLD', division: 'IV', lp: 0 })
			})

			it('2799 → DIAMOND I 99LP', () => {
				expect(getRankDisplay(2799)).toEqual({ tier: 'DIAMOND', division: 'I', lp: 99 })
			})

			it('2800 → MASTER 0LP', () => {
				expect(getRankDisplay(2800)).toEqual({ tier: 'MASTER', division: null, lp: 0 })
			})
		})

		describe('Division境界 (GOLDで代表)', () => {
			it('1299 → GOLD IV 99LP', () => {
				expect(getRankDisplay(1299)).toEqual({ tier: 'GOLD', division: 'IV', lp: 99 })
			})

			it('1300 → GOLD III 0LP', () => {
				expect(getRankDisplay(1300)).toEqual({ tier: 'GOLD', division: 'III', lp: 0 })
			})

			it('1400 → GOLD II 0LP', () => {
				expect(getRankDisplay(1400)).toEqual({ tier: 'GOLD', division: 'II', lp: 0 })
			})

			it('1500 → GOLD I 0LP', () => {
				expect(getRankDisplay(1500)).toEqual({ tier: 'GOLD', division: 'I', lp: 0 })
			})

			it('1599 → GOLD I 99LP', () => {
				expect(getRankDisplay(1599)).toEqual({ tier: 'GOLD', division: 'I', lp: 99 })
			})
		})

		describe('MASTER以上 (ディビジョンなし)', () => {
			it('MASTER: LP = rating - 2800', () => {
				expect(getRankDisplay(3000)).toEqual({ tier: 'MASTER', division: null, lp: 200 })
			})

			it('3200 → GRANDMASTER 0LP', () => {
				expect(getRankDisplay(3200)).toEqual({ tier: 'GRANDMASTER', division: null, lp: 0 })
			})

			it('3600 → CHALLENGER 0LP', () => {
				expect(getRankDisplay(3600)).toEqual({ tier: 'CHALLENGER', division: null, lp: 0 })
			})

			it('CHALLENGER: LP上限なし', () => {
				expect(getRankDisplay(4000)).toEqual({ tier: 'CHALLENGER', division: null, lp: 400 })
			})
		})
	})

	describe('formatRankDisplay', () => {
		it('ディビジョンあり', () => {
			expect(formatRankDisplay({ tier: 'GOLD', division: 'IV', lp: 0 })).toBe('GOLD IV 0LP')
		})

		it('ディビジョンなし', () => {
			expect(formatRankDisplay({ tier: 'MASTER', division: null, lp: 120 })).toBe('MASTER 120LP')
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
