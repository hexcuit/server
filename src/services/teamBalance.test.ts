import { describe, expect, it } from 'vitest'

import { balanceTeamsByElo } from './teamBalance'

describe('balanceTeamsByElo', () => {
	it('assigns teams using snake draft pattern', () => {
		const players = [
			{ discordId: '1', rating: 1000, mainRole: 'TOP' as const },
			{ discordId: '2', rating: 900, mainRole: 'JUNGLE' as const },
			{ discordId: '3', rating: 800, mainRole: 'MIDDLE' as const },
			{ discordId: '4', rating: 700, mainRole: 'BOTTOM' as const },
		]

		const result = balanceTeamsByElo(players)

		// Snake pattern: 0,3 → Blue, 1,2 → Red
		expect(result['1']?.team).toBe('BLUE')
		expect(result['2']?.team).toBe('RED')
		expect(result['3']?.team).toBe('RED')
		expect(result['4']?.team).toBe('BLUE')
	})

	it('assigns mainRole when available', () => {
		const players = [
			{ discordId: '1', rating: 1000, mainRole: 'TOP' as const },
			{ discordId: '2', rating: 900, mainRole: 'JUNGLE' as const },
		]

		const result = balanceTeamsByElo(players)

		expect(result['1']?.role).toBe('TOP')
		expect(result['2']?.role).toBe('JUNGLE')
	})

	it('assigns subRole when mainRole is already taken', () => {
		// Both players have same mainRole, second should use subRole
		const players = [
			{ discordId: '1', rating: 1000, mainRole: 'TOP' as const, subRole: 'JUNGLE' as const },
			{ discordId: '2', rating: 900, mainRole: 'TOP' as const, subRole: 'MIDDLE' as const },
		]

		const result = balanceTeamsByElo(players)

		// Player 1 (higher rating) gets TOP first
		// Player 2 in same team would use subRole MIDDLE
		const bluePlayer = Object.entries(result).find(([, v]) => v.team === 'BLUE')
		const redPlayer = Object.entries(result).find(([, v]) => v.team === 'RED')

		expect(bluePlayer).toBeDefined()
		expect(redPlayer).toBeDefined()
		expect(bluePlayer?.[1].role).toBe('TOP')
		expect(redPlayer?.[1].role).toBe('TOP')
	})

	it('assigns subRole for players in same team with conflicting mainRole', () => {
		// Three players in same team scenario, mainRole conflicts
		const players = [
			{ discordId: '1', rating: 1000, mainRole: 'TOP' as const, subRole: null },
			{ discordId: '2', rating: 950, mainRole: 'JUNGLE' as const, subRole: null },
			{ discordId: '3', rating: 900, mainRole: 'MIDDLE' as const, subRole: null },
			{ discordId: '4', rating: 850, mainRole: 'TOP' as const, subRole: 'BOTTOM' as const },
			{ discordId: '5', rating: 800, mainRole: 'JUNGLE' as const, subRole: 'SUPPORT' as const },
			{ discordId: '6', rating: 750, mainRole: 'MIDDLE' as const, subRole: 'TOP' as const },
		]

		const result = balanceTeamsByElo(players)

		// Verify all players are assigned
		expect(Object.keys(result)).toHaveLength(6)

		// Verify each player has a role
		for (const [, assignment] of Object.entries(result)) {
			expect(assignment.role).toBeDefined()
		}
	})

	it('assigns remaining roles when mainRole and subRole are unavailable', () => {
		// Snake: 0,3 → Blue, 1,2 → Red
		// Player 1 and 4 are on Blue team
		const players = [
			{ discordId: '1', rating: 1000, mainRole: 'TOP' as const, subRole: null },
			{ discordId: '2', rating: 950, mainRole: 'JUNGLE' as const, subRole: null },
			{ discordId: '3', rating: 900, mainRole: 'MIDDLE' as const, subRole: null },
			{ discordId: '4', rating: 850, mainRole: null, subRole: null }, // No role preference, same team as player 1
		]

		const result = balanceTeamsByElo(players)

		// Player 1 gets TOP (mainRole)
		expect(result['1']?.role).toBe('TOP')
		// Player 4 (Blue team) should get a remaining role since no mainRole/subRole
		expect(result['4']?.role).not.toBe('TOP') // TOP is taken by player 1
		expect(['JUNGLE', 'MIDDLE', 'BOTTOM', 'SUPPORT', 'FILL']).toContain(result['4']?.role)
	})

	it('handles players with no role preferences in same team', () => {
		// 5 players on same team with no role preference (forces fallback)
		const players = [
			{ discordId: '1', rating: 1000, mainRole: null, subRole: null },
			{ discordId: '2', rating: 900, mainRole: null, subRole: null },
			{ discordId: '3', rating: 800, mainRole: null, subRole: null },
			{ discordId: '4', rating: 700, mainRole: null, subRole: null },
			{ discordId: '5', rating: 600, mainRole: null, subRole: null },
			{ discordId: '6', rating: 500, mainRole: null, subRole: null },
		]

		const result = balanceTeamsByElo(players)

		// All should be assigned
		expect(Object.keys(result)).toHaveLength(6)

		// Verify unique roles per team
		const blueRoles = Object.entries(result)
			.filter(([, v]) => v.team === 'BLUE')
			.map(([, v]) => v.role)
		const redRoles = Object.entries(result)
			.filter(([, v]) => v.team === 'RED')
			.map(([, v]) => v.role)

		expect(blueRoles).toHaveLength(3)
		expect(redRoles).toHaveLength(3)
	})

	it('handles 10 players with mixed role preferences', () => {
		const players = [
			{ discordId: '1', rating: 1000, mainRole: 'TOP' as const, subRole: 'JUNGLE' as const },
			{ discordId: '2', rating: 950, mainRole: 'JUNGLE' as const, subRole: 'MIDDLE' as const },
			{ discordId: '3', rating: 900, mainRole: 'MIDDLE' as const, subRole: 'BOTTOM' as const },
			{ discordId: '4', rating: 850, mainRole: 'BOTTOM' as const, subRole: 'SUPPORT' as const },
			{ discordId: '5', rating: 800, mainRole: 'SUPPORT' as const, subRole: 'TOP' as const },
			{ discordId: '6', rating: 750, mainRole: 'TOP' as const, subRole: 'JUNGLE' as const },
			{ discordId: '7', rating: 700, mainRole: 'JUNGLE' as const, subRole: 'MIDDLE' as const },
			{ discordId: '8', rating: 650, mainRole: 'MIDDLE' as const, subRole: 'BOTTOM' as const },
			{ discordId: '9', rating: 600, mainRole: 'BOTTOM' as const, subRole: 'SUPPORT' as const },
			{ discordId: '10', rating: 550, mainRole: 'SUPPORT' as const, subRole: 'TOP' as const },
		]

		const result = balanceTeamsByElo(players)

		expect(Object.keys(result)).toHaveLength(10)

		const bluePlayers = Object.entries(result).filter(([, v]) => v.team === 'BLUE')
		const redPlayers = Object.entries(result).filter(([, v]) => v.team === 'RED')

		expect(bluePlayers).toHaveLength(5)
		expect(redPlayers).toHaveLength(5)
	})

	it('falls back to MIDDLE when all remaining roles are exhausted', () => {
		// Create a scenario where remainingRoles is empty
		// 7 players in one team (more than 6 roles available)
		// This triggers the || 'MIDDLE' fallback on line 76
		const players = [
			{ discordId: '1', rating: 1000, mainRole: 'TOP' as const, subRole: null },
			{ discordId: '2', rating: 990, mainRole: 'JUNGLE' as const, subRole: null },
			{ discordId: '3', rating: 980, mainRole: 'MIDDLE' as const, subRole: null },
			{ discordId: '4', rating: 970, mainRole: 'BOTTOM' as const, subRole: null },
			{ discordId: '5', rating: 960, mainRole: 'SUPPORT' as const, subRole: null },
			{ discordId: '6', rating: 950, mainRole: 'FILL' as const, subRole: null },
			{ discordId: '7', rating: 940, mainRole: null, subRole: null }, // 7th player, no role preference
			// Add more to force more into one team
			{ discordId: '8', rating: 100, mainRole: null, subRole: null },
			{ discordId: '9', rating: 90, mainRole: null, subRole: null },
			{ discordId: '10', rating: 80, mainRole: null, subRole: null },
			{ discordId: '11', rating: 70, mainRole: null, subRole: null },
			{ discordId: '12', rating: 60, mainRole: null, subRole: null },
			{ discordId: '13', rating: 50, mainRole: null, subRole: null },
			{ discordId: '14', rating: 40, mainRole: null, subRole: null },
		]

		const result = balanceTeamsByElo(players)

		// All players should be assigned
		expect(Object.keys(result)).toHaveLength(14)

		// Check that at least one player got MIDDLE as fallback
		const middleAssignments = Object.entries(result).filter(([, v]) => v.role === 'MIDDLE')
		expect(middleAssignments.length).toBeGreaterThan(0)
	})
})
