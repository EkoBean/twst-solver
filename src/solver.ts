import { parseSkill } from './skills';
import type {
  Card,
  Element,
  RankPriority,
  SupportRecommendation,
  TeamResult,
  TeamScore,
  Weights,
} from './types';

/**
 * 計分規則（與 simulator/buddycount 的角色集合判定一致）：
 * - 隊伍的「角色集合」S = 隊上所有卡的 chara。同角色重複只算一次。
 * - buddy：每張卡的 3 個槽，buddyNc 在 S 內，就加該槽技能分。
 * - DUO：卡的 duo 不為空且在 S 內，加 1。
 *
 * 關鍵觀察：分數只取決於「角色集合 S」和「每張卡自己的槽」。
 * 所以不枚舉卡片組合，而是枚舉 S；對固定的 S，每張卡的價值互相獨立，
 * 最佳解 = 每個角色各取一張最高分的卡（確保 S 被完整覆蓋），
 * 剩下名額取其餘最高分的卡。這樣是精確解，而且只要枚舉角色子集
 * （約 25 個角色、最多 5 個，約 7 萬種），不用枚舉上億種卡片組合。
 *
 * 相互 DUO 加分：隊上有 a 角色的卡 DUO 指向 b、同時有 b 角色的卡 DUO 指向 a，
 * 這一對角色加 mutual 分（每對角色最多加一次）。這一條取決於「選了哪張卡」而不只是角色集合，
 * 所以求解時多枚舉「要啟動哪幾對」：對每種啟動組合，強制選入能成對的卡，其餘照舊。
 */

export interface PreparedCard {
  card: Card;
  /** 該卡使用的 buddy 技能分（已依手牌突破狀態選好 s / s_totsu） */
  slots: { char: string; w: number }[];
  /** 1 = 這張卡的類型就是使用者優先的類型 */
  typeMatch: 0 | 1;
  /** 魔法屬性相符加分：M2 符合加 magic2Weight，M1、M3 各符合加 magicOtherWeight */
  elemScore: number;
}

/** useTotsu 為真時用 buddy*s_totsu，否則用 buddy*s。 */
export function prepareCard(card: Card, useTotsu: boolean, weights: Weights): PreparedCard {
  const raw = useTotsu
    ? [card.buddy1s_totsu, card.buddy2s_totsu, card.buddy3s_totsu]
    : [card.buddy1s, card.buddy2s, card.buddy3s];
  const chars = [card.buddy1c, card.buddy2c, card.buddy3c];
  const slots = chars.map((char, i) => ({ char, w: parseSkill(raw[i] ?? '', weights) }));
  const typeMatch = weights.cardType !== 'バランス' && card.attr === weights.cardType ? 1 : 0;
  const el = weights.element;
  const elemScore = el
    ? (card.magic2atr === el ? weights.magic2Weight : 0) +
      (card.magic1atr === el ? weights.magicOtherWeight : 0) +
      (card.magic3atr === el ? weights.magicOtherWeight : 0)
    : 0;
  return { card, slots, typeMatch, elemScore };
}

export function hasElement(card: Card, element: Element): boolean {
  return card.magic1atr === element || card.magic2atr === element || card.magic3atr === element;
}

// 四層字典序：主要項 > 次要項 > 魔法屬性加分 > 類型相符的卡數。每層的最小單位（0.5）都大於下一層的最大值，
// 所以直接加總就等於逐層比較；而且除了相互 DUO，都是「每張卡各自一份」，求解器的精確性不受影響。
const HI = 1e9;
const LO = 1e6;
const EL = 1e3;

function combine(duo: number, buddy: number, rank: RankPriority, elem = 0, typed = 0): number {
  const tail = elem * EL + typed;
  return rank === 'duo' ? duo * HI + buddy * LO + tail : buddy * HI + duo * LO + tail;
}

/** 參考實作：直接算一支隊伍的分數。求解器的結果必須與它一致。 */
export function scoreTeam(team: PreparedCard[], rank: RankPriority, mutual = 0): TeamScore {
  const set = new Set(team.map((p) => p.card.chara));
  let duo = 0;
  let buddy = 0;
  for (const p of team) {
    if (p.card.duo && set.has(p.card.duo)) duo += 1;
    for (const s of p.slots) if (s.w > 0 && set.has(s.char)) buddy += s.w;
  }
  duo += mutual * mutualPairs(team.map((p) => p.card)).length;
  const typed = team.reduce((n, p) => n + p.typeMatch, 0);
  const elem = team.reduce((n, p) => n + p.elemScore, 0);
  return { duo, buddy, typed, elem, total: combine(duo, buddy, rank, elem, typed) };
}

/** 隊上互相 DUO 的角色對（a 的卡指向 b，b 的卡也指向 a），每對只列一次。 */
export function mutualPairs(team: Card[]): [string, string][] {
  const SEP = '\u0000';
  const edges = new Set(team.filter((c) => c.duo && c.duo !== c.chara).map((c) => `${c.chara}${SEP}${c.duo}`));
  const out: [string, string][] = [];
  for (const e of edges) {
    const [a, b] = e.split(SEP) as [string, string];
    if (a < b && edges.has(`${b}${SEP}${a}`)) out.push([a, b]);
  }
  return out;
}

// ---- 內部：以角色索引加速 ----

interface Indexed {
  p: PreparedCard;
  ci: number; // 自己的角色索引
  duoCi: number; // -1 = 無或不在宇宙內
  slotCi: [number, number, number];
  slotW: [number, number, number];
}

function makeIndexer(universe: string[]) {
  const map = new Map(universe.map((c, i) => [c, i]));
  return (p: PreparedCard): Indexed => {
    const slotCi: [number, number, number] = [-1, -1, -1];
    const slotW: [number, number, number] = [0, 0, 0];
    p.slots.forEach((s, i) => {
      if (i < 3) {
        slotCi[i] = map.get(s.char) ?? -1;
        slotW[i] = s.w;
      }
    });
    return {
      p,
      ci: map.get(p.card.chara) ?? -1,
      duoCi: p.card.duo ? (map.get(p.card.duo) ?? -1) : -1,
      slotCi,
      slotW,
    };
  };
}

function cardValue(c: Indexed, member: Uint8Array, rank: RankPriority): number {
  const duo = c.duoCi >= 0 && member[c.duoCi] ? 1 : 0;
  let buddy = 0;
  for (let i = 0; i < 3; i++) {
    const ci = c.slotCi[i] as number;
    if (ci >= 0 && member[ci]) buddy += c.slotW[i] as number;
  }
  return combine(duo, buddy, rank, c.p.elemScore, c.p.typeMatch);
}

/** 枚舉 universe 的所有大小 1..maxSize 的子集，逐一呼叫 visit。 */
function forEachSubset(
  indices: number[],
  maxSize: number,
  member: Uint8Array,
  visit: (subset: number[]) => void,
): void {
  const chosen: number[] = [];
  const rec = (start: number) => {
    if (chosen.length > 0) visit(chosen);
    if (chosen.length === maxSize) return;
    for (let i = start; i < indices.length; i++) {
      const ci = indices[i] as number;
      const prev = member[ci] as number; // 預先標好的成員（固定卡的角色）不能被清掉
      chosen.push(ci);
      member[ci] = 1;
      rec(i + 1);
      member[ci] = prev;
      chosen.pop();
    }
  };
  rec(0);
}

/**
 * 在「角色集合恰為 subset」的前提下，從 byChar 選 size 張卡（不含 pre），回傳最佳總分與卡片。
 * pre：已經確定在隊上的卡（固定卡、support、為相互 DUO 強制選入的卡）。
 *   total 含 pre 的分數；cards 不含 pre。
 * member 必須已標好 S（可以比 subset 多出 support 角色）。
 * 做不到（某角色沒卡，或卡不夠）回傳 null。
 */
function bestCover(
  subset: number[],
  size: number,
  byChar: Indexed[][],
  member: Uint8Array,
  rank: RankPriority,
  pre: Indexed[] = [],
): { total: number; cards: Indexed[] } | null {
  const preSet = new Set(pre);
  const covered = new Set(pre.map((c) => c.ci));
  const forced: Indexed[] = [];
  const rest: { c: Indexed; v: number }[] = [];
  let total = 0;
  for (const c of pre) total += cardValue(c, member, rank);
  for (const ci of subset) {
    const list = byChar[ci];
    if (!list || list.length === 0) return null;
    if (covered.has(ci)) {
      // 這個角色已經被 pre 覆蓋，它的卡都只是候補
      for (const c of list) if (!preSet.has(c)) rest.push({ c, v: cardValue(c, member, rank) });
      continue;
    }
    let best: Indexed | null = null;
    let bestV = -Infinity;
    for (const c of list) {
      const v = cardValue(c, member, rank);
      if (v > bestV) {
        if (best) rest.push({ c: best, v: bestV });
        best = c;
        bestV = v;
      } else {
        rest.push({ c, v });
      }
    }
    forced.push(best as Indexed);
    total += bestV;
  }
  const need = size - forced.length; // size = 不含 pre 還要選幾張
  if (need < 0) return null;
  if (need > 0) {
    if (rest.length < need) return null;
    rest.sort((a, b) => b.v - a.v);
    for (let i = 0; i < need; i++) {
      total += (rest[i] as { c: Indexed; v: number }).v;
      forced.push((rest[i] as { c: Indexed; v: number }).c);
    }
  }
  return { total, cards: forced };
}

/** edge[a*n+b] = 1：卡池裡有「角色 a、DUO 指向 b」的卡。 */
function buildEdges(byChar: Indexed[][], n: number): Uint8Array {
  const edge = new Uint8Array(n * n);
  for (const list of byChar) for (const c of list) if (c.duoCi >= 0 && c.duoCi !== c.ci) edge[c.ci * n + c.duoCi] = 1;
  return edge;
}

/**
 * 加上相互 DUO 加分的 bestCover。mutual <= 0 時等同 bestCover。
 * 枚舉「要啟動哪幾對互相 DUO 的角色」；啟動的每一對，各自強制選入最高分的成對卡，
 * 其餘照 bestCover 湊。沒被啟動卻剛好成對的組合只會被低估，不影響最大值。
 */
function coverWithMutual(
  subset: number[],
  size: number,
  byChar: Indexed[][],
  edge: Uint8Array,
  n: number,
  member: Uint8Array,
  rank: RankPriority,
  mutual: number,
  pre: Indexed[],
): { total: number; cards: Indexed[] } | null {
  if (mutual <= 0) return bestCover(subset, size, byChar, member, rank, pre);
  const chars = [...new Set([...subset, ...pre.map((c) => c.ci)])].sort((a, b) => a - b);
  const has = (a: number, b: number) => edge[a * n + b] === 1 || pre.some((c) => c.ci === a && c.duoCi === b);
  const pairs: [number, number][] = [];
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const a = chars[i] as number;
      const b = chars[j] as number;
      if (has(a, b) && has(b, a)) pairs.push([a, b]);
    }
  }
  const unit = rank === 'duo' ? mutual * HI : mutual * LO;
  let best: { total: number; cards: Indexed[] } | null = null;
  for (let mask = 0; mask < 1 << pairs.length; mask++) {
    const extras: Indexed[] = [];
    let ok = true;
    let count = 0;
    for (let k = 0; k < pairs.length && ok; k++) {
      if (!(mask & (1 << k))) continue;
      count++;
      const [a, b] = pairs[k] as [number, number];
      for (const [x, y] of [[a, b], [b, a]] as [number, number][]) {
        if ([...pre, ...extras].some((c) => c.ci === x && c.duoCi === y)) continue;
        let pick: Indexed | null = null;
        let pv = -Infinity;
        for (const c of byChar[x] ?? []) {
          if (c.duoCi !== y || extras.includes(c)) continue;
          const v = cardValue(c, member, rank);
          if (v > pv) {
            pv = v;
            pick = c;
          }
        }
        if (!pick) {
          ok = false;
          break;
        }
        extras.push(pick);
      }
    }
    if (!ok || extras.length > size) continue;
    const r = bestCover(subset, size - extras.length, byChar, member, rank, [...pre, ...extras]);
    if (!r) continue;
    const total = r.total + unit * count;
    if (!best || total > best.total) best = { total, cards: [...extras, ...r.cards] };
  }
  return best;
}

function groupByChar(cards: Indexed[], n: number): Indexed[][] {
  const byChar: Indexed[][] = Array.from({ length: n }, () => []);
  for (const c of cards) if (c.ci >= 0) (byChar[c.ci] as Indexed[]).push(c);
  return byChar;
}

function universeOf(...pools: PreparedCard[][]): string[] {
  const set = new Set<string>();
  for (const pool of pools) for (const p of pool) set.add(p.card.chara);
  return [...set].sort();
}

class TopN {
  private items: { total: number; key: string; payload: Indexed[]; support?: Indexed }[] = [];
  constructor(private readonly n: number) {}
  offer(total: number, payload: Indexed[], support?: Indexed): void {
    if (this.items.length >= this.n && total <= (this.items[this.items.length - 1] as { total: number }).total) return;
    const key = [...payload.map((c) => c.p.card.name)].sort().join('|') + (support ? `+${support.p.card.name}` : '');
    if (this.items.some((it) => it.key === key)) return;
    this.items.push({ total, key, payload, support });
    this.items.sort((a, b) => b.total - a.total);
    if (this.items.length > this.n) this.items.pop();
  }
  all() {
    return this.items;
  }
}

function toResult(
  cards: Indexed[],
  support: Indexed | undefined,
  rank: RankPriority,
  mutual: number,
): TeamResult {
  const all = support ? [...cards, support] : cards;
  const score = scoreTeam(all.map((c) => c.p), rank, mutual);
  return {
    cards: all.map((c) => c.p.card),
    supportName: support?.p.card.name,
    score,
  };
}

/**
 * 模式 A：只用手牌，找最佳 size 張（4 或 5）隊伍，回傳前 topN 名。
 * fixed：指定一張一定要在隊上的卡（新卡效益用）。它不必在手牌裡，其餘 size-1 張才從手牌選。
 */
export function solveOwned(
  owned: PreparedCard[],
  size: number,
  rank: RankPriority,
  topN = 10,
  fixed?: PreparedCard,
  mutual = 0,
): TeamResult[] {
  const pool = fixed ? owned.filter((p) => p.card.name !== fixed.card.name) : owned;
  const k = fixed ? size - 1 : size;
  if (pool.length < k) return [];
  const universe = universeOf(pool, ...(fixed ? [[fixed]] : []));
  const index = makeIndexer(universe);
  const cards = pool.map(index);
  const fixedIdx = fixed ? index(fixed) : undefined;
  const byChar = groupByChar(cards, universe.length);
  const edge = buildEdges(byChar, universe.length);
  const member = new Uint8Array(universe.length);
  if (fixedIdx && fixedIdx.ci >= 0) member[fixedIdx.ci] = 1;
  const top = new TopN(topN);
  const ownedChars = universe.map((_, i) => i).filter((i) => (byChar[i] as Indexed[]).length > 0);

  forEachSubset(ownedChars, k, member, (subset) => {
    const best = coverWithMutual(subset, k, byChar, edge, universe.length, member, rank, mutual, fixedIdx ? [fixedIdx] : []);
    if (!best) return;
    top.offer(best.total, fixedIdx ? [...best.cards, fixedIdx] : best.cards);
  });
  return top.all().map((it) => toResult(it.payload, undefined, rank, mutual));
}

/**
 * 模式 B（4+1）：4 張來自手牌，第 5 張是朋友的 support，可以是 supports 裡任何一張。
 * 回傳每張 support 搭配手牌能達到的最佳隊伍，依分數由高到低，取前 topN。
 */
export function solveWithSupport(
  owned: PreparedCard[],
  supports: PreparedCard[],
  rank: RankPriority,
  topN = 15,
  fixed?: PreparedCard,
  mutual = 0,
): SupportRecommendation[] {
  const pool = fixed ? owned.filter((p) => p.card.name !== fixed.card.name) : owned;
  const OWN = fixed ? 3 : 4;
  if (pool.length < OWN || supports.length === 0) return [];
  const universe = universeOf(pool, supports, ...(fixed ? [[fixed]] : []));
  const index = makeIndexer(universe);
  const fixedIdx = fixed ? index(fixed) : undefined;
  const ownedIdx = pool.map(index);
  const supportIdx = supports.map(index);
  const ownedBy = groupByChar(ownedIdx, universe.length);
  const edge = buildEdges(ownedBy, universe.length);
  const nU = universe.length;
  const supportBy = groupByChar(supportIdx, universe.length);
  const member = new Uint8Array(universe.length);
  const ownedChars = universe.map((_, i) => i).filter((i) => (ownedBy[i] as Indexed[]).length > 0);

  // 每張 support 目前找到的最佳（總分與 4 張手牌）
  if (fixedIdx && fixedIdx.ci >= 0) member[fixedIdx.ci] = 1;
  const bestPer = new Map<string, { total: number; own: Indexed[]; support: Indexed }>();

  forEachSubset(ownedChars, OWN, member, (subset) => {
    // support 角色 x 可以是 universe 內任何角色；若 x 不在 subset，先把它標進 S
    for (let x = 0; x < universe.length; x++) {
      const list = supportBy[x];
      if (!list || list.length === 0) continue;
      const wasMember = member[x] === 1;
      member[x] = 1;
      const fixedPre = fixedIdx ? [fixedIdx] : [];
      // 手牌部分只算一次，每張 support 再各加自己的分數
      const own = coverWithMutual(subset, OWN, ownedBy, edge, nU, member, rank, mutual, fixedPre);
      if (own) {
        const ownCards = fixedIdx ? [...own.cards, fixedIdx] : own.cards;
        for (const s of list) {
          let total = own.total + cardValue(s, member, rank);
          let cards = ownCards;
          // 這張 support 可能和隊上卡互相 DUO：把它當成固定卡重算，才不會漏掉成對加分
          const canPair =
            mutual > 0 && s.duoCi >= 0 && s.duoCi !== s.ci && member[s.duoCi] === 1 && edge[s.duoCi * nU + s.ci] === 1;
          if (canPair) {
            const withS = coverWithMutual(subset, OWN, ownedBy, edge, nU, member, rank, mutual, [...fixedPre, s]);
            if (withS) {
              total = withS.total;
              cards = fixedIdx ? [...withS.cards, fixedIdx] : withS.cards;
            }
          }
          const prev = bestPer.get(s.p.card.name);
          if (!prev || total > prev.total) bestPer.set(s.p.card.name, { total, own: cards, support: s });
        }
      }
      if (!wasMember) member[x] = 0;
    }
  });

  return [...bestPer.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, topN)
    .map((b) => ({ support: b.support.p.card, team: toResult(b.own, b.support, rank, mutual) }));
}
