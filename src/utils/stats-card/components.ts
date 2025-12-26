import type { MatchHistoryItem, RatingHistoryPoint, StatsCardData } from './types'

// カラーパレット
const colors = {
	background: '#1a1f2e',
	cardBg: '#252b3b',
	border: '#dc3545',
	text: '#ffffff',
	textMuted: '#8b949e',
	win: '#22c55e',
	lose: '#ef4444',
	accent: '#5865f2',
}

// パーセンタイル計算
function getPercentile(position: number, total: number): string {
	if (total === 0) return ''
	const percentile = ((position / total) * 100).toFixed(1)
	return `TOP ${percentile}%`
}

// ヘッダーセクション
function Header({
	displayName,
	avatarUrl,
	rank,
	rating,
}: {
	displayName: string
	avatarUrl: string
	rank: string
	rating: number
}) {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				padding: '20px 24px',
				borderBottom: `3px solid ${colors.border}`,
			},
			children: [
				{
					type: 'div',
					props: {
						style: { display: 'flex', alignItems: 'center', gap: '16px' },
						children: [
							{
								type: 'img',
								props: {
									src: avatarUrl,
									width: 64,
									height: 64,
									style: { borderRadius: '50%' },
								},
							},
							{
								type: 'div',
								props: {
									style: { display: 'flex', flexDirection: 'column', gap: '4px' },
									children: [
										{
											type: 'span',
											props: {
												style: {
													fontSize: '28px',
													fontWeight: 700,
													color: colors.text,
												},
												children: displayName,
											},
										},
										{
											type: 'span',
											props: {
												style: {
													fontSize: '14px',
													color: colors.accent,
													fontWeight: 600,
												},
												children: rank,
											},
										},
									],
								},
							},
						],
					},
				},
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-end',
						},
						children: [
							{
								type: 'span',
								props: {
									style: { color: colors.textMuted, fontSize: '12px' },
									children: 'RATING',
								},
							},
							{
								type: 'span',
								props: {
									style: {
										fontSize: '42px',
										fontWeight: 700,
										color: colors.text,
									},
									children: rating.toString(),
								},
							},
						],
					},
				},
			],
		},
	}
}

// 統計カード（シンプル版）
function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				backgroundColor: colors.cardBg,
				padding: '16px',
				borderLeft: `3px solid ${colors.border}`,
				flex: 1,
			},
			children: [
				{
					type: 'span',
					props: {
						style: { color: colors.textMuted, fontSize: '11px', fontWeight: 600 },
						children: label,
					},
				},
				{
					type: 'span',
					props: {
						style: {
							fontSize: '32px',
							fontWeight: 700,
							color: colors.text,
							marginTop: '4px',
						},
						children: value,
					},
				},
				...(subtext
					? [
							{
								type: 'span',
								props: {
									style: {
										color: colors.textMuted,
										fontSize: '10px',
										marginTop: '4px',
									},
									children: subtext,
								},
							},
						]
					: []),
			],
		},
	}
}

// 統計グリッド
function StatsGrid({ data }: { data: StatsCardData }) {
	const totalGames = data.wins + data.losses
	const positionText = data.position && data.totalPlayers ? getPercentile(data.position, data.totalPlayers) : undefined

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				gap: '4px',
				flex: 1,
			},
			children: [
				{
					type: 'div',
					props: {
						style: { display: 'flex', gap: '4px' },
						children: [
							StatCard({
								label: 'RANK',
								value: data.position ? `#${data.position}` : '-',
								subtext: positionText,
							}),
							StatCard({
								label: 'WINRATE',
								value: `${data.winRate}%`,
							}),
							StatCard({
								label: 'GAMES',
								value: totalGames.toString(),
							}),
						],
					},
				},
				{
					type: 'div',
					props: {
						style: { display: 'flex', gap: '4px' },
						children: [
							StatCard({
								label: 'WINS',
								value: data.wins.toString(),
							}),
							StatCard({
								label: 'LOSSES',
								value: data.losses.toString(),
							}),
							...(data.isPlacement
								? [
										StatCard({
											label: 'PLACEMENT',
											value: `${data.placementGames ?? 0}/5`,
										}),
									]
								: [
										StatCard({
											label: 'W/L RATIO',
											value: data.losses > 0 ? (data.wins / data.losses).toFixed(2) : data.wins.toString(),
										}),
									]),
						],
					},
				},
			],
		},
	}
}

// 試合履歴アイテム
function MatchHistoryItemComponent({ match, index }: { match: MatchHistoryItem; index: number }) {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				alignItems: 'center',
				fontSize: '12px',
				gap: '8px',
				padding: '4px 0',
			},
			children: [
				{
					type: 'span',
					props: {
						style: { color: colors.textMuted, width: '20px' },
						children: `${index + 1}.`,
					},
				},
				{
					type: 'span',
					props: {
						style: {
							color: match.won ? colors.win : colors.lose,
							fontWeight: 700,
							width: '40px',
						},
						children: match.won ? 'WIN' : 'LOSE',
					},
				},
				{
					type: 'span',
					props: {
						style: {
							color: match.won ? colors.win : colors.lose,
						},
						children: `${match.won ? '+' : ''}${match.change}`,
					},
				},
			],
		},
	}
}

// 試合履歴セクション
function MatchHistorySection({ matches }: { matches: MatchHistoryItem[] }) {
	if (matches.length === 0) {
		return {
			type: 'div',
			props: {
				style: {
					display: 'flex',
					flexDirection: 'column',
					backgroundColor: colors.cardBg,
					padding: '16px',
					width: '180px',
				},
				children: [
					{
						type: 'span',
						props: {
							style: { color: colors.textMuted, fontSize: '11px' },
							children: 'RECENT MATCHES',
						},
					},
					{
						type: 'span',
						props: {
							style: {
								color: colors.textMuted,
								fontSize: '12px',
								marginTop: '12px',
							},
							children: 'No matches yet',
						},
					},
				],
			},
		}
	}

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				backgroundColor: colors.cardBg,
				padding: '16px',
				width: '180px',
			},
			children: [
				{
					type: 'span',
					props: {
						style: {
							color: colors.textMuted,
							fontSize: '11px',
							marginBottom: '8px',
							fontWeight: 600,
						},
						children: 'RECENT MATCHES',
					},
				},
				{
					type: 'div',
					props: {
						style: { display: 'flex', flexDirection: 'column' },
						children: matches.slice(0, 5).map((match, i) => MatchHistoryItemComponent({ match, index: i })),
					},
				},
			],
		},
	}
}

// レーティンググラフ
function RatingChart({ history }: { history: RatingHistoryPoint[] }) {
	if (history.length < 2) {
		return {
			type: 'div',
			props: {
				style: {
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					backgroundColor: colors.cardBg,
					padding: '16px',
					height: '120px',
				},
				children: [
					{
						type: 'span',
						props: {
							style: { color: colors.textMuted, fontSize: '12px' },
							children: 'Not enough data for chart',
						},
					},
				],
			},
		}
	}

	const chartWidth = 540
	const chartHeight = 80
	const padding = { left: 8, right: 8, top: 8, bottom: 8 }

	const ratings = history.map((p) => p.rating)
	const minRating = Math.min(...ratings) - 50
	const maxRating = Math.max(...ratings) + 50
	const range = maxRating - minRating || 1

	// ポイントを計算
	const points = history.map((point, i) => {
		const x = padding.left + (i / (history.length - 1)) * (chartWidth - padding.left - padding.right)
		const y = padding.top + (1 - (point.rating - minRating) / range) * (chartHeight - padding.top - padding.bottom)
		return { x, y, ...point }
	})

	const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

	const firstPoint = points[0]
	const lastPoint = points[points.length - 1]
	if (!firstPoint || !lastPoint) return { type: 'div', props: { children: [] } }

	const areaPath = `${linePath} L ${lastPoint.x} ${chartHeight - padding.bottom} L ${firstPoint.x} ${chartHeight - padding.bottom} Z`

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				backgroundColor: colors.cardBg,
				padding: '12px',
				flex: 1,
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '8px',
						},
						children: [
							{
								type: 'span',
								props: {
									style: {
										color: colors.textMuted,
										fontSize: '11px',
										fontWeight: 600,
									},
									children: 'RATING HISTORY',
								},
							},
							{
								type: 'span',
								props: {
									style: {
										color: colors.accent,
										fontSize: '11px',
										fontWeight: 600,
									},
									children: `${Math.round(minRating)} - ${Math.round(maxRating)}`,
								},
							},
						],
					},
				},
				{
					type: 'svg',
					props: {
						width: chartWidth,
						height: chartHeight,
						viewBox: `0 0 ${chartWidth} ${chartHeight}`,
						children: [
							// グリッド線
							{
								type: 'line',
								props: {
									x1: padding.left,
									y1: chartHeight - padding.bottom,
									x2: chartWidth - padding.right,
									y2: chartHeight - padding.bottom,
									stroke: '#3a4255',
									strokeWidth: 1,
								},
							},
							// 塗りつぶしエリア
							{
								type: 'path',
								props: {
									d: areaPath,
									fill: 'rgba(88, 101, 242, 0.2)',
								},
							},
							// ライン
							{
								type: 'path',
								props: {
									d: linePath,
									fill: 'none',
									stroke: colors.accent,
									strokeWidth: 2,
								},
							},
							// ポイント（最新のみ）
							{
								type: 'circle',
								props: {
									cx: lastPoint.x,
									cy: lastPoint.y,
									r: 4,
									fill: colors.accent,
								},
							},
						],
					},
				},
			],
		},
	}
}

// プレースメントバナー
function PlacementBanner({ games }: { games: number }) {
	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: colors.accent,
				padding: '8px',
				gap: '8px',
			},
			children: [
				{
					type: 'span',
					props: {
						style: {
							color: colors.text,
							fontSize: '12px',
							fontWeight: 600,
						},
						children: `Placement Matches: ${games}/5 completed`,
					},
				},
			],
		},
	}
}

// メインコンポーネント
export function createStatsCard(data: StatsCardData) {
	// biome-ignore lint/suspicious/noExplicitAny: satori の仮想 DOM 構造のため any を使用
	const children: any[] = [
		Header({
			displayName: data.displayName,
			avatarUrl: data.avatarUrl,
			rank: data.rank,
			rating: data.rating,
		}),
	]

	// プレースメント中ならバナーを表示
	if (data.isPlacement) {
		children.push(PlacementBanner({ games: data.placementGames ?? 0 }))
	}

	// 統計と試合履歴
	children.push({
		type: 'div',
		props: {
			style: {
				display: 'flex',
				gap: '4px',
				padding: '12px',
			},
			children: [StatsGrid({ data }), MatchHistorySection({ matches: data.matchHistory })],
		},
	})

	// レーティンググラフ
	children.push({
		type: 'div',
		props: {
			style: {
				display: 'flex',
				padding: '0 12px 12px 12px',
			},
			children: [RatingChart({ history: data.ratingHistory })],
		},
	})

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				flexDirection: 'column',
				width: '580px',
				height: '440px',
				backgroundColor: colors.background,
				fontFamily: 'Inter',
			},
			children,
		},
	}
}
