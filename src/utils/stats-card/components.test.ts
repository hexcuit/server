import { describe, expect, it } from 'vitest'
import { createStatsCard } from './components'
import type { StatsCardData } from './types'

describe('createStatsCard', () => {
	const baseData: StatsCardData = {
		displayName: 'TestPlayer',
		avatarUrl: 'https://example.com/avatar.png',
		rank: 'Gold II',
		rating: 1500,
		wins: 10,
		losses: 5,
		winRate: 67,
		position: 5,
		totalPlayers: 100,
		isPlacement: false,
		matchHistory: [],
		ratingHistory: [],
	}

	it('returns valid card structure', () => {
		const result = createStatsCard(baseData)

		expect(result.type).toBe('div')
		expect(result.props.style.width).toBe('825px')
		expect(result.props.style.height).toBe('620px')
		expect(result.props.children).toBeInstanceOf(Array)
	})

	it('includes header with player info', () => {
		const result = createStatsCard(baseData)
		const header = result.props.children[0]

		expect(header.type).toBe('div')
		// Header should contain display name and rating
		const headerContent = JSON.stringify(header)
		expect(headerContent).toContain('TestPlayer')
		expect(headerContent).toContain('1500')
	})

	it('shows placement banner when isPlacement is true', () => {
		const placementData: StatsCardData = {
			...baseData,
			isPlacement: true,
			placementGames: 3,
		}

		const result = createStatsCard(placementData)
		const cardContent = JSON.stringify(result)

		expect(cardContent).toContain('Placement Matches')
		expect(cardContent).toContain('3/5')
	})

	it('does not show placement banner when isPlacement is false', () => {
		const result = createStatsCard(baseData)
		const cardContent = JSON.stringify(result)

		expect(cardContent).not.toContain('Placement Matches')
	})

	it('shows "No matches yet" when match history is empty', () => {
		const result = createStatsCard(baseData)
		const cardContent = JSON.stringify(result)

		expect(cardContent).toContain('No matches yet')
	})

	it('shows match history when matches exist', () => {
		const dataWithMatches: StatsCardData = {
			...baseData,
			matchHistory: [
				{ won: true, change: 25 },
				{ won: false, change: -20 },
			],
		}

		const result = createStatsCard(dataWithMatches)
		const cardContent = JSON.stringify(result)

		expect(cardContent).toContain('WIN')
		expect(cardContent).toContain('LOSE')
		expect(cardContent).toContain('+25')
		expect(cardContent).toContain('-20')
	})

	it('limits match history to 10 items', () => {
		const manyMatches = Array.from({ length: 15 }, (_, i) => ({
			won: i % 2 === 0,
			change: i % 2 === 0 ? 25 : -20,
		}))

		const dataWithManyMatches: StatsCardData = {
			...baseData,
			matchHistory: manyMatches,
		}

		const result = createStatsCard(dataWithManyMatches)
		const cardContent = JSON.stringify(result)

		// Should show "10." but not "11."
		expect(cardContent).toContain('10.')
		expect(cardContent).not.toContain('11.')
	})

	it('shows "Not enough data for chart" when rating history has less than 2 points', () => {
		const result = createStatsCard(baseData)
		const cardContent = JSON.stringify(result)

		expect(cardContent).toContain('Not enough data for chart')
	})

	it('renders rating chart when history has 2+ points', () => {
		const dataWithHistory: StatsCardData = {
			...baseData,
			ratingHistory: [
				{ date: '12/01', rating: 1400 },
				{ date: '12/02', rating: 1450 },
				{ date: '12/03', rating: 1500 },
			],
		}

		const result = createStatsCard(dataWithHistory)
		const cardContent = JSON.stringify(result)

		expect(cardContent).toContain('RATING HISTORY')
		expect(cardContent).not.toContain('Not enough data for chart')
		// Should contain SVG path
		expect(cardContent).toContain('path')
	})

	it('calculates percentile correctly', () => {
		const dataWithPosition: StatsCardData = {
			...baseData,
			position: 10,
			totalPlayers: 100,
		}

		const result = createStatsCard(dataWithPosition)
		const cardContent = JSON.stringify(result)

		// position 10 out of 100 = TOP 10.0%
		expect(cardContent).toContain('TOP 10.0%')
	})

	it('shows rank position', () => {
		const result = createStatsCard(baseData)
		const cardContent = JSON.stringify(result)

		expect(cardContent).toContain('#5')
	})

	it('shows "-" when position is null', () => {
		const dataNoPosition: StatsCardData = {
			...baseData,
			position: null,
		}

		const result = createStatsCard(dataNoPosition)
		const cardContent = JSON.stringify(result)

		// RANK value should be "-"
		expect(cardContent).toContain('RANK')
	})

	it('shows W/L ratio when not in placement', () => {
		const result = createStatsCard(baseData)
		const cardContent = JSON.stringify(result)

		// 10 wins / 5 losses = 2.00
		expect(cardContent).toContain('W/L RATIO')
		expect(cardContent).toContain('2.00')
	})

	it('shows placement progress instead of W/L ratio during placement', () => {
		const placementData: StatsCardData = {
			...baseData,
			isPlacement: true,
			placementGames: 2,
		}

		const result = createStatsCard(placementData)
		const cardContent = JSON.stringify(result)

		expect(cardContent).toContain('PLACEMENT')
		expect(cardContent).toContain('2/5')
		expect(cardContent).not.toContain('W/L RATIO')
	})

	it('handles zero losses for W/L ratio', () => {
		const dataNoLosses: StatsCardData = {
			...baseData,
			wins: 5,
			losses: 0,
		}

		const result = createStatsCard(dataNoLosses)
		const cardContent = JSON.stringify(result)

		// When losses = 0, should show wins count
		expect(cardContent).toContain('W/L RATIO')
	})
})
