import { describe, expect, it } from 'vitest'

import {
	INITIAL_RATING,
	K_FACTOR_NORMAL,
	K_FACTOR_PLACEMENT,
	PLACEMENT_GAMES,
} from '@/constants/rating'

import {
	calculateExpectedScore,
	calculateNewRating,
	calculateTeamAverageRating,
	formatRankDisplay,
	getRankDisplay,
	isInPlacement,
} from './elo'

describe('Elo Rating Utilities', () => {
	describe('Constants', () => {
		it('initial rating is 1200 (Gold IV 0LP)', () => {
			expect(INITIAL_RATING).toBe(1200)
		})

		it('normal K-Factor is 32', () => {
			expect(K_FACTOR_NORMAL).toBe(32)
		})

		it('placement K-Factor is 64', () => {
			expect(K_FACTOR_PLACEMENT).toBe(64)
		})

		it('placement games count is 5', () => {
			expect(PLACEMENT_GAMES).toBe(5)
		})
	})

	describe('calculateExpectedScore', () => {
		it('returns 0.5 when ratings are equal', () => {
			expect(calculateExpectedScore(1200, 1200)).toBeCloseTo(0.5, 5)
		})

		it('returns ~0.909 when 400 points higher', () => {
			expect(calculateExpectedScore(1600, 1200)).toBeCloseTo(0.909, 2)
		})

		it('returns ~0.091 when 400 points lower', () => {
			expect(calculateExpectedScore(800, 1200)).toBeCloseTo(0.091, 2)
		})
	})

	describe('calculateNewRating', () => {
		it('gains +16 when winning against equal rating', () => {
			expect(calculateNewRating(1200, 1200, true, false)).toBe(1216)
		})

		it('loses -16 when losing against equal rating', () => {
			expect(calculateNewRating(1200, 1200, false, false)).toBe(1184)
		})

		it('has larger gain during placement (+32)', () => {
			expect(calculateNewRating(1200, 1200, true, true)).toBe(1232)
		})

		it('no rating loss during placement (0 change on defeat)', () => {
			expect(calculateNewRating(1200, 1200, false, true)).toBe(1200)
			expect(calculateNewRating(800, 1200, false, true)).toBe(800)
			expect(calculateNewRating(1600, 1200, false, true)).toBe(1600)
		})

		it('high vs low rating: small gain on win, large loss on defeat', () => {
			expect(calculateNewRating(1600, 1200, true, false)).toBe(1603)
			expect(calculateNewRating(1600, 1200, false, false)).toBe(1571)
		})

		it('low vs high rating: large gain on win, small loss on defeat', () => {
			expect(calculateNewRating(800, 1200, true, false)).toBe(829)
			expect(calculateNewRating(800, 1200, false, false)).toBe(797)
		})

		it('rating cannot go below 0', () => {
			expect(calculateNewRating(10, 10, false, false)).toBe(0)
		})
	})

	describe('calculateTeamAverageRating', () => {
		it('returns INITIAL_RATING for empty array', () => {
			expect(calculateTeamAverageRating([])).toBe(INITIAL_RATING)
		})

		it('calculates average with rounding', () => {
			expect(calculateTeamAverageRating([1100, 1200, 1300])).toBe(1200)
			expect(calculateTeamAverageRating([1201, 1202])).toBe(1202)
		})
	})

	describe('getRankDisplay', () => {
		describe('Error cases', () => {
			it('throws for negative rating', () => {
				expect(() => getRankDisplay(-1)).toThrow('Invalid rating: -1')
			})
		})

		describe('Tier boundaries', () => {
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

			it('1200 → GOLD IV 0LP (initial rating)', () => {
				expect(getRankDisplay(1200)).toEqual({ tier: 'GOLD', division: 'IV', lp: 0 })
			})

			it('2799 → DIAMOND I 99LP', () => {
				expect(getRankDisplay(2799)).toEqual({ tier: 'DIAMOND', division: 'I', lp: 99 })
			})

			it('2800 → MASTER 0LP', () => {
				expect(getRankDisplay(2800)).toEqual({ tier: 'MASTER', division: null, lp: 0 })
			})
		})

		describe('Division boundaries (using GOLD)', () => {
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

		describe('MASTER and above (no division)', () => {
			it('MASTER: LP = rating - 2800', () => {
				expect(getRankDisplay(3000)).toEqual({ tier: 'MASTER', division: null, lp: 200 })
			})

			it('3200 → GRANDMASTER 0LP', () => {
				expect(getRankDisplay(3200)).toEqual({ tier: 'GRANDMASTER', division: null, lp: 0 })
			})

			it('3600 → CHALLENGER 0LP', () => {
				expect(getRankDisplay(3600)).toEqual({ tier: 'CHALLENGER', division: null, lp: 0 })
			})

			it('CHALLENGER: no LP cap', () => {
				expect(getRankDisplay(4000)).toEqual({ tier: 'CHALLENGER', division: null, lp: 400 })
			})
		})
	})

	describe('formatRankDisplay', () => {
		it('formats with division', () => {
			expect(formatRankDisplay({ tier: 'GOLD', division: 'IV', lp: 0 })).toBe('GOLD IV 0LP')
		})

		it('formats without division', () => {
			expect(formatRankDisplay({ tier: 'MASTER', division: null, lp: 120 })).toBe('MASTER 120LP')
		})
	})

	describe('isInPlacement', () => {
		it('returns true for less than 5 games', () => {
			expect(isInPlacement(0)).toBe(true)
			expect(isInPlacement(4)).toBe(true)
		})

		it('returns false for 5 or more games', () => {
			expect(isInPlacement(5)).toBe(false)
			expect(isInPlacement(10)).toBe(false)
		})
	})
})
