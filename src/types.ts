/** chara.json 的一筆卡片（只列求解器用到的欄位）。 */
export interface Card {
  name: string; // 例如 azul_birth，同時是手牌 JSON 的 cardName
  chara: string; // 角色名（日文），buddy / duo 都用它比對
  costume: string;
  rare: string;
  attr: string; // アタック / バランス / ディフェンス
  duo: string; // DUO 對象角色，可能為空字串
  buddy1c: string;
  buddy2c: string;
  buddy3c: string;
  buddy1s: string;
  buddy2s: string;
  buddy3s: string;
  buddy1s_totsu: string;
  buddy2s_totsu: string;
  buddy3s_totsu: string;
  magic1atr: string; // 火 / 水 / 木 / 無
  magic2atr: string;
  magic3atr: string;
  implementation_date?: string; // YYYY/MM/DD
}

/** characters_info.json 的一筆（角色順序、所屬寮）。 */
export interface CharaInfo {
  name_ja: string;
  name_en: string;
  dorm: string;
}

/** 手牌 JSON（twst-hand-collection-sets-v1）中的單張卡。 */
export interface HandEntry {
  cardName: string;
  isOwned: boolean;
  level?: number;
  totsu?: number;
  isLimitBreak?: boolean;
  isM3?: boolean;
  /** 匯入時保留未知欄位，匯出時原樣寫回 */
  [extra: string]: unknown;
}

/** BAL = Balance：HP 與 ATK 權重相同，不加倍率 */
export type StatPriority = 'HP' | 'ATK' | 'BAL';
/** 卡片類型（chara.json 的 attr）。バランス 在這裡代表「不指定」。 */
export type CardTypePref = 'アタック' | 'ディフェンス' | 'バランス';

export type RankPriority = 'duo' | 'buddy';
export type Element = '火' | '水' | '木' | '無';

export interface Weights {
  /** 優先的那一項乘上這個倍率 */
  statPriority: StatPriority;
  primaryMultiplier: number;
  /** 技能大小對應的分數 */
  sizes: { 極小: number; 小: number; 中: number; 大: number };
  /** クリティカル 額外加權 */
  crit: { 小: number; 中: number; 大: number };
  /** 相互 DUO（a 的 DUO 是 b、b 的 DUO 也是 a）每一對角色加的分數，0 = 不加 */
  mutualDuo: number;
  /** 優先放哪一種類型的卡；バランス = 不管 */
  cardType: CardTypePref;
}

export const DEFAULT_WEIGHTS: Weights = {
  statPriority: 'ATK',
  primaryMultiplier: 2,
  sizes: { 極小: 0.5, 小: 1, 中: 2, 大: 3 },
  crit: { 小: 0.5, 中: 1, 大: 1.5 },
  mutualDuo: 0.5,
  cardType: 'バランス',
};

export interface TeamScore {
  duo: number;
  buddy: number;
  /** 隊上符合「優先類型」的卡數（優先類型為 バランス 時一律 0） */
  typed: number;
  /** 依 RankPriority 合成的單一排序值 */
  total: number;
}

export interface TeamResult {
  cards: Card[];
  /** 4+1 模式時，support 卡的 name；否則為 undefined */
  supportName?: string;
  score: TeamScore;
}

export interface SupportRecommendation {
  support: Card;
  /** 搭配這張 support 的最佳 4 張隊伍 */
  team: TeamResult;
}
