import { describe, expect, it } from 'vitest';
import { prepareCard, scoreTeam, solveOwned, solveWithSupport, hasElement, type PreparedCard } from './solver';
import { DEFAULT_WEIGHTS, type Card, type RankPriority } from './types';

// 可重現的亂數
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const CHARS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const SKILLS = ['', 'HPUP(小)', 'ATKUP(小)', 'ATKUP(中)', 'HPUP(中)', 'HP&ATKUP(小)'];

function randomCard(r: () => number, name: string): Card {
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)] as T;
  return {
    name,
    chara: pick(CHARS),
    costume: '',
    rare: 'SSR',
    attr: 'バランス',
    duo: r() < 0.8 ? pick(CHARS) : '',
    buddy1c: pick(CHARS),
    buddy2c: pick(CHARS),
    buddy3c: pick(CHARS),
    buddy1s: pick(SKILLS),
    buddy2s: pick(SKILLS),
    buddy3s: pick(SKILLS),
    buddy1s_totsu: pick(SKILLS),
    buddy2s_totsu: pick(SKILLS),
    buddy3s_totsu: pick(SKILLS),
    magic1atr: '火',
    magic2atr: '水',
    magic3atr: '木',
  };
}

function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length === k) return void out.push([...cur]);
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i] as T);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

function prepAll(cards: Card[], totsu: boolean): PreparedCard[] {
  return cards.map((c) => prepareCard(c, totsu, DEFAULT_WEIGHTS));
}

describe('solveOwned：與暴力枚舉結果一致', () => {
  for (const rank of ['duo', 'buddy'] as RankPriority[]) {
    for (const size of [4, 5]) {
      it(`rank=${rank} size=${size}`, () => {
        for (let seed = 1; seed <= 12; seed++) {
          const r = rng(seed * 7919 + size);
          const owned = prepAll(Array.from({ length: 13 }, (_, i) => randomCard(r, `o${i}`)), seed % 2 === 0);
          const brute = Math.max(...combos(owned, size).map((t) => scoreTeam(t, rank).total));
          const res = solveOwned(owned, size, rank, 3);
          expect(res[0]?.score.total, `seed=${seed}`).toBe(brute);
        }
      });
    }
  }

  it('回傳隊伍的分數與參考實作一致，且卡數正確', () => {
    const r = rng(42);
    const owned = prepAll(Array.from({ length: 14 }, (_, i) => randomCard(r, `o${i}`)), true);
    const res = solveOwned(owned, 5, 'buddy', 5);
    for (const team of res) {
      expect(team.cards).toHaveLength(5);
      expect(new Set(team.cards.map((c) => c.name)).size).toBe(5);
      const prepared = team.cards.map((c) => owned.find((o) => o.card.name === c.name) as PreparedCard);
      expect(scoreTeam(prepared, 'buddy').total).toBe(team.score.total);
    }
  });

  it('手牌不夠時回傳空陣列', () => {
    const r = rng(1);
    const owned = prepAll(Array.from({ length: 3 }, (_, i) => randomCard(r, `o${i}`)), true);
    expect(solveOwned(owned, 4, 'duo')).toEqual([]);
  });
});

describe('solveWithSupport：與暴力枚舉結果一致', () => {
  for (const rank of ['duo', 'buddy'] as RankPriority[]) {
    it(`rank=${rank}`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const r = rng(seed * 104729);
        const owned = prepAll(Array.from({ length: 11 }, (_, i) => randomCard(r, `o${i}`)), seed % 2 === 0);
        const supports = prepAll(Array.from({ length: 9 }, (_, i) => randomCard(r, `s${i}`)), true);
        const recs = solveWithSupport(owned, supports, rank, 100);
        const fours = combos(owned, 4);
        for (const s of supports) {
          const brute = Math.max(...fours.map((t) => scoreTeam([...t, s], rank).total));
          const rec = recs.find((x) => x.support.name === s.card.name);
          expect(rec?.team.score.total, `seed=${seed} support=${s.card.name}`).toBe(brute);
        }
        // 結果依分數由高到低
        for (let i = 1; i < recs.length; i++) {
          expect((recs[i - 1] as { team: { score: { total: number } } }).team.score.total).toBeGreaterThanOrEqual(
            (recs[i] as { team: { score: { total: number } } }).team.score.total,
          );
        }
      }
    });
  }
});

describe('hasElement', () => {
  it('卡片三個魔法有任一個是該屬性就算', () => {
    const r = rng(3);
    const c = randomCard(r, 'x');
    expect(hasElement(c, '火')).toBe(true);
    expect(hasElement(c, '無')).toBe(false);
  });
});

describe('指定固定卡（新卡效益）：與暴力枚舉一致', () => {
  for (const rank of ['duo', 'buddy'] as RankPriority[]) {
    it(`solveOwned fixed rank=${rank}`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const r = rng(seed * 104729);
        const owned = prepAll(Array.from({ length: 12 }, (_, i) => randomCard(r, `o${i}`)), true);
        const fixed = prepAll([randomCard(r, 'NEW')], true)[0] as PreparedCard;
        for (const size of [4, 5]) {
          const brute = Math.max(...combos(owned, size - 1).map((t) => scoreTeam([...t, fixed], rank).total));
          const res = solveOwned(owned, size, rank, 3, fixed);
          expect(res[0]?.score.total, `seed=${seed} size=${size}`).toBe(brute);
          expect(res[0]?.cards.some((c) => c.name === 'NEW')).toBe(true);
        }
      }
    });
    it(`solveWithSupport fixed rank=${rank}`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const r = rng(seed * 31337);
        const owned = prepAll(Array.from({ length: 10 }, (_, i) => randomCard(r, `o${i}`)), true);
        const supports = prepAll(Array.from({ length: 6 }, (_, i) => randomCard(r, `s${i}`)), true);
        const fixed = prepAll([randomCard(r, 'NEW')], true)[0] as PreparedCard;
        let brute = -Infinity;
        for (const t of combos(owned, 3)) for (const sp of supports) brute = Math.max(brute, scoreTeam([...t, fixed, sp], rank).total);
        const res = solveWithSupport(owned, supports, rank, 3, fixed);
        expect(res[0]?.team.score.total, `seed=${seed}`).toBe(brute);
        expect(res[0]?.team.cards).toHaveLength(5);
      }
    });
  }
});

describe('相互 DUO 加分：與暴力枚舉一致', () => {
  const MUTUAL = 0.5;
  for (const rank of ['duo', 'buddy'] as RankPriority[]) {
    it(`solveOwned rank=${rank}`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const r = rng(seed * 6007);
        const owned = prepAll(Array.from({ length: 12 }, (_, i) => randomCard(r, `o${i}`)), true);
        for (const size of [4, 5]) {
          const brute = Math.max(...combos(owned, size).map((t) => scoreTeam(t, rank, MUTUAL).total));
          expect(solveOwned(owned, size, rank, 3, undefined, MUTUAL)[0]?.score.total, `seed=${seed} size=${size}`).toBe(brute);
        }
      }
    });
    it(`固定卡 rank=${rank}`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const r = rng(seed * 9091);
        const owned = prepAll(Array.from({ length: 11 }, (_, i) => randomCard(r, `o${i}`)), true);
        const fixed = prepAll([randomCard(r, 'NEW')], true)[0] as PreparedCard;
        const brute = Math.max(...combos(owned, 3).map((t) => scoreTeam([...t, fixed], rank, MUTUAL).total));
        const res = solveOwned(owned, 4, rank, 3, fixed, MUTUAL);
        expect(res[0]?.score.total, `seed=${seed}`).toBe(brute);
      }
    });
    it(`4+1 rank=${rank}`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const r = rng(seed * 7717);
        const owned = prepAll(Array.from({ length: 10 }, (_, i) => randomCard(r, `o${i}`)), true);
        const supports = prepAll(Array.from({ length: 6 }, (_, i) => randomCard(r, `s${i}`)), true);
        let brute = -Infinity;
        for (const t of combos(owned, 4)) for (const sp of supports) brute = Math.max(brute, scoreTeam([...t, sp], rank, MUTUAL).total);
        expect(solveWithSupport(owned, supports, rank, 3, undefined, MUTUAL)[0]?.team.score.total, `seed=${seed}`).toBe(brute);
        // 固定卡 + support
        const fixed = prepAll([randomCard(r, 'NEW')], true)[0] as PreparedCard;
        let b2 = -Infinity;
        for (const t of combos(owned, 3)) for (const sp of supports) b2 = Math.max(b2, scoreTeam([...t, fixed, sp], rank, MUTUAL).total);
        expect(solveWithSupport(owned, supports, rank, 3, fixed, MUTUAL)[0]?.team.score.total, `fixed seed=${seed}`).toBe(b2);
      }
    });
  }
});

describe('卡片類型優先：只在 DUO / buddy 同分時決勝，且與暴力枚舉一致', () => {
  const ATTRS = ['アタック', 'ディフェンス', 'バランス'];
  const W = { ...DEFAULT_WEIGHTS, cardType: 'アタック' as const };
  const withAttr = (r: () => number, name: string): Card => ({ ...randomCard(r, name), attr: ATTRS[Math.floor(r() * 3)] as string });
  const prep = (cards: Card[]) => cards.map((c) => prepareCard(c, true, W));

  for (const rank of ['duo', 'buddy'] as RankPriority[]) {
    it(`solveOwned / 4+1 / 固定卡 rank=${rank}`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const r = rng(seed * 4177);
        const owned = prep(Array.from({ length: 11 }, (_, i) => withAttr(r, `o${i}`)));
        const supports = prep(Array.from({ length: 5 }, (_, i) => withAttr(r, `s${i}`)));
        const fixed = prep([withAttr(r, 'NEW')])[0] as PreparedCard;
        const M = 0.5;
        const b5 = Math.max(...combos(owned, 5).map((t) => scoreTeam(t, rank, M).total));
        expect(solveOwned(owned, 5, rank, 2, undefined, M)[0]?.score.total, `5 seed=${seed}`).toBe(b5);
        let b41 = -Infinity;
        for (const t of combos(owned, 4)) for (const sp of supports) b41 = Math.max(b41, scoreTeam([...t, sp], rank, M).total);
        expect(solveWithSupport(owned, supports, rank, 2, undefined, M)[0]?.team.score.total, `4+1 seed=${seed}`).toBe(b41);
        const bf = Math.max(...combos(owned, 4).map((t) => scoreTeam([...t, fixed], rank, M).total));
        expect(solveOwned(owned, 5, rank, 2, fixed, M)[0]?.score.total, `fixed seed=${seed}`).toBe(bf);
      }
    });
  }

  it('DUO / buddy 不同分時，類型不會蓋過它們', () => {
    const r = rng(7);
    const owned = prep(Array.from({ length: 12 }, (_, i) => withAttr(r, `o${i}`)));
    const base = solveOwned(prepAll(owned.map((p) => p.card), true), 5, 'duo', 1)[0] as { score: { duo: number; buddy: number } };
    const typed = solveOwned(owned, 5, 'duo', 1)[0] as { score: { duo: number; buddy: number } };
    expect(typed.score.duo).toBe(base.score.duo);
    expect(typed.score.buddy).toBe(base.score.buddy);
  });
});

describe('魔法屬性加分：M2 優先、M1 / M3 同權，只在 DUO / buddy 同分時決勝', () => {
  const ELS = ['火', '水', '木', '無'];
  const W = { ...DEFAULT_WEIGHTS, element: '火' as const, magic2Weight: 2, magicOtherWeight: 1 };
  const withMagic = (r: () => number, name: string): Card => {
    const pickEl = () => ELS[Math.floor(r() * 4)] as string;
    return { ...randomCard(r, name), magic1atr: pickEl(), magic2atr: pickEl(), magic3atr: pickEl() };
  };
  const prep = (cards: Card[]) => cards.map((c) => prepareCard(c, true, W));

  it('prepareCard：M2 加 2、M1 與 M3 各加 1', () => {
    const base = randomCard(rng(1), 'x');
    const mk = (m1: string, m2: string, m3: string) => prepareCard({ ...base, magic1atr: m1, magic2atr: m2, magic3atr: m3 }, true, W).elemScore;
    expect(mk('火', '水', '木')).toBe(1);
    expect(mk('水', '火', '木')).toBe(2);
    expect(mk('水', '木', '火')).toBe(1);
    expect(mk('火', '火', '火')).toBe(4);
    expect(mk('水', '水', '水')).toBe(0);
  });

  for (const rank of ['duo', 'buddy'] as RankPriority[]) {
    it(`與暴力枚舉一致 rank=${rank}`, () => {
      for (let seed = 1; seed <= 8; seed++) {
        const r = rng(seed * 2909);
        const owned = prep(Array.from({ length: 11 }, (_, i) => withMagic(r, `o${i}`)));
        const supports = prep(Array.from({ length: 5 }, (_, i) => withMagic(r, `s${i}`)));
        const M = 0.5;
        const b5 = Math.max(...combos(owned, 5).map((t) => scoreTeam(t, rank, M).total));
        expect(solveOwned(owned, 5, rank, 2, undefined, M)[0]?.score.total, `5 seed=${seed}`).toBe(b5);
        let b41 = -Infinity;
        for (const t of combos(owned, 4)) for (const sp of supports) b41 = Math.max(b41, scoreTeam([...t, sp], rank, M).total);
        expect(solveWithSupport(owned, supports, rank, 2, undefined, M)[0]?.team.score.total, `4+1 seed=${seed}`).toBe(b41);
      }
    });
  }
});
