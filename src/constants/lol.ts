// LoLティア定義
export const LOL_TIERS = [
	'IRON',
	'BRONZE',
	'SILVER',
	'GOLD',
	'PLATINUM',
	'EMERALD',
	'DIAMOND',
	'MASTER',
	'GRANDMASTER',
	'CHALLENGER',
] as const
export type LolTier = (typeof LOL_TIERS)[number]

// LoLディビジョン定義（低→高の順序: IV が最下位、I が最上位）
export const LOL_DIVISIONS = ['IV', 'III', 'II', 'I'] as const
export type LolDivision = (typeof LOL_DIVISIONS)[number]

// LoLロール定義
export const LOL_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const
export type LolRole = (typeof LOL_ROLES)[number]
