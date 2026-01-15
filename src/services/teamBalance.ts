/**
 * チーム分けロジック
 * スネークドラフト方式でEloレーティングに基づいてチームをバランスよく分配
 */

import { LOL_ROLES, type LolRole, type LolTeam, type RolePreference } from '@/constants'

type PlayerWithRating = {
	discordId: string
	mainRole: RolePreference
	subRole: RolePreference
	rating: number
}

type TeamAssignment = {
	team: LolTeam
	role: LolRole
	rating: number
}

type TeamAssignments = Record<string, TeamAssignment>

// FILL でない実際のゲームロールかチェック
const isGameRole = (role: RolePreference): role is LolRole => role !== 'FILL'

/**
 * Eloレーティングに基づいてチームをバランス良く分配する
 * スネークドラフト方式: 0,3,4,7,8 → Blue, 1,2,5,6,9 → Red
 */
export const balanceTeamsByElo = (players: PlayerWithRating[]): TeamAssignments => {
	// レーティング順でソート
	const sorted = [...players].sort((a, b) => b.rating - a.rating)

	// スネークドラフト方式で分配
	const blueTeam: typeof sorted = []
	const redTeam: typeof sorted = []

	sorted.forEach((p, i) => {
		// 0,3,4,7,8 → Blue, 1,2,5,6,9 → Red (スネーク)
		const round = Math.floor(i / 2)
		const isBlue = round % 2 === 0 ? i % 2 === 0 : i % 2 !== 0
		if (isBlue) {
			blueTeam.push(p)
		} else {
			redTeam.push(p)
		}
	})

	// ロールを割り当て
	const assignRoles = (
		team: typeof sorted,
	): Array<{ discordId: string; role: LolRole; rating: number }> => {
		const assigned: Array<{ discordId: string; role: LolRole; rating: number }> = []
		const usedRoles = new Set<LolRole>()

		// まずメインロールで割り当て（FILL 以外）
		for (const p of team) {
			if (isGameRole(p.mainRole) && !usedRoles.has(p.mainRole)) {
				assigned.push({ discordId: p.discordId, role: p.mainRole, rating: p.rating })
				usedRoles.add(p.mainRole)
			}
		}

		// サブロールで割り当て（FILL 以外）
		for (const p of team) {
			if (!assigned.find((a) => a.discordId === p.discordId)) {
				if (isGameRole(p.subRole) && !usedRoles.has(p.subRole)) {
					assigned.push({ discordId: p.discordId, role: p.subRole, rating: p.rating })
					usedRoles.add(p.subRole)
				}
			}
		}

		// 残りは空いているロールを割り当て（FILL の人もここで割り当て）
		const remainingRoles = [...LOL_ROLES].filter((r) => !usedRoles.has(r))
		for (const p of team) {
			if (!assigned.find((a) => a.discordId === p.discordId)) {
				const role = remainingRoles.shift() || 'MIDDLE'
				assigned.push({ discordId: p.discordId, role, rating: p.rating })
			}
		}

		return assigned
	}

	const blueAssigned = assignRoles(blueTeam)
	const redAssigned = assignRoles(redTeam)

	const result: TeamAssignments = {}
	for (const p of blueAssigned) {
		result[p.discordId] = { team: 'BLUE', role: p.role, rating: p.rating }
	}
	for (const p of redAssigned) {
		result[p.discordId] = { team: 'RED', role: p.role, rating: p.rating }
	}

	return result
}
