import { hasElement, prepareCard, type PreparedCard } from './solver';
import type { Card, CharaInfo, Element, Weights } from './types';

export interface Catalog {
  cards: Card[]; // 已排序：角色順序 → 稀有度 → 實裝日新到舊
  byName: Map<string, Card>;
  syncedAt?: string;
}

const RARITY_ORDER: Record<string, number> = { SSR: 0, SR: 1, R: 2 };

export function sortCards(cards: Card[], info: CharaInfo[]): Card[] {
  const order = new Map(info.map((c, i) => [c.name_ja, i]));
  const rank = (c: Card) => order.get(c.chara) ?? 999;
  return [...cards].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (RARITY_ORDER[a.rare] ?? 9) - (RARITY_ORDER[b.rare] ?? 9) ||
      (b.implementation_date ?? '').localeCompare(a.implementation_date ?? ''),
  );
}

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

// 角色 → 代表卡。DUO / buddy 對象是「角色」不是卡，畫頭像時需要挑一張卡來代表。
// 優先順序：服裝名剛好是【制服】 > 卡片 ID 以 _uniform 結尾（例如オルト的アーキタイプ・ギア）
// > 該角色排序第一張（教職員等沒有制服的角色）。
const repCards = new Map<string, Card>();

function repScore(c: Card): number {
  if (c.costume === '制服') return 2;
  if (/_uniform$/i.test(c.name)) return 1;
  return 0;
}

export function registerCatalog(cards: Card[]): void {
  repCards.clear();
  for (const c of cards) {
    const prev = repCards.get(c.chara);
    if (!prev || repScore(c) > repScore(prev)) repCards.set(c.chara, c);
  }
}

// 角色 → 寮。七個寮各自一組；其他（教職員、特別角色等）一律歸 SPECIAL。
export const DORMS = ['ハーツラビュル', 'サバナクロー', 'オクタヴィネル', 'スカラビア', 'ポムフィオーレ', 'イグニハイド', 'ディアソムニア'] as const;
export const SPECIAL = 'SPECIAL';
const charaDorm = new Map<string, string>();

export function dormOf(chara: string): string {
  return charaDorm.get(chara) ?? SPECIAL;
}

/** 依寮分組，順序為七個寮、最後 SPECIAL；組內維持傳入的順序。空組不回傳。 */
export function groupByDorm(charas: string[]): { dorm: string; charas: string[] }[] {
  const keys: string[] = [...DORMS, SPECIAL];
  return keys
    .map((dorm) => ({ dorm, charas: charas.filter((c) => dormOf(c) === dorm) }))
    .filter((g) => g.charas.length > 0);
}

export function repCard(chara: string): Card | undefined {
  return repCards.get(chara);
}

export async function loadCatalog(): Promise<Catalog> {
  const [cards, info, meta] = await Promise.all([
    getJson<Card[]>('chara.json'),
    getJson<CharaInfo[]>('characters_info.json').catch(() => [] as CharaInfo[]),
    getJson<{ syncedAt: string }>('meta.json').catch(() => null),
  ]);
  const sorted = sortCards(cards, info);
  charaDorm.clear();
  for (const c of info) if ((DORMS as readonly string[]).includes(c.dorm)) charaDorm.set(c.name_ja, c.dorm);
  registerCatalog(sorted);
  return { cards: sorted, byName: new Map(sorted.map((c) => [c.name, c])), syncedAt: meta?.syncedAt };
}

export interface Pools {
  owned: PreparedCard[];
  supports: PreparedCard[];
}

/**
 * 求解器的輸入。持有只看布林值（不看等級與突破）：
 * 所有卡的 buddy 技能一律取完全突破後的版本（buddy*s_totsu）。
 * support（朋友的卡）同樣視為完全突破，可以是整個卡池的任一張。
 */
export function buildPools(
  cards: Card[],
  owned: Set<string>,
  weights: Weights,
  element: Element | null,
): Pools {
  const keep = (c: Card) => element === null || hasElement(c, element);
  return {
    owned: cards.filter((c) => owned.has(c.name) && keep(c)).map((c) => prepareCard(c, true, weights)),
    supports: cards.filter(keep).map((c) => prepareCard(c, true, weights)),
  };
}

export function cardLabel(c: Card): string {
  return `${c.chara}【${c.costume}】${c.rare}`;
}

export const ELEMENTS: Element[] = ['火', '水', '木', '無'];
export const RARITIES = ['SSR', 'SR', 'R'] as const;
