// 試合履歴
export type MatchHistoryItem = {
	won: boolean
	change: number
}

// レーティング履歴（グラフ用）
export type RatingHistoryPoint = {
	date: string // "12/25" 形式
	rating: number
}

// 統計カードデータの型
export type StatsCardData = {
	// プレイヤー情報
	displayName: string
	avatarUrl: string

	// ランク情報
	rank: string // "Gold II" など
	rating: number

	// 統計
	wins: number
	losses: number
	winRate: number

	// 順位（オプション）
	position: number | null
	totalPlayers?: number // パーセンタイル計算用

	// プレースメント
	isPlacement: boolean
	placementGames?: number

	// 直近の試合履歴
	matchHistory: MatchHistoryItem[]

	// レーティング履歴（グラフ用）
	ratingHistory: RatingHistoryPoint[]
}
