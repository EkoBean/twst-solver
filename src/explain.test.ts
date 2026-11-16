import { describe, expect, it } from 'vitest';
import { cardLinks, explainTeam, targetsOf, totalsOf } from './explain';
import { prepareCard, scoreTeam, solveOwned } from './solver';
import { DEFAULT_WEIGHTS, type Card } from './types';

const mk = (name: string, chara: string, duo: string, buddies: [string, string][]): Card => {
  const [b1, b2, b3] = [0, 1, 2].map((i) => buddies[i] ?? ['', '']);
  return {
    name, chara, costume: name, rare: 'SSR', attr: '', duo,
    buddy1c: b1?.[0] ?? '', buddy2c: b2?.[0] ?? '', buddy3c: b3?.[0] ?? '',
    buddy1s: '', buddy2s: '', buddy3s: '',
    buddy1s_totsu: b1?.[1] ?? '', buddy2s_totsu: b2?.[1] ?? '', buddy3s_totsu: b3?.[1] ?? '',
    magic1atr: '火', magic2atr: '水', magic3atr: '木',
  };
};

describe('cardLinks：以一張卡為單位', () => {
  const a = mk('a', 'A', 'B', [['B', 'ATKUP(中)'], ['C', 'HPUP(小)'], ['Z', 'ATKUP(小)']]);
  const b = mk('b', 'B', 'Q', [['A', 'HPUP(中)'], ['', ''], ['', '']]);
  const team = [a, b];

  it('3 個 buddy 對象全列出，在隊上的成立、不在的不成立', () => {
    const l = cardLinks(a, team, DEFAULT_WEIGHTS);
    expect(l.buddy.map((s) => [s.chara, s.matched])).toEqual([['B', true], ['C', false], ['Z', false]]);
    expect(l.duo).toEqual({ chara: 'B', matched: true });
  });

  it('沒有的槽（空角色）不列出；DUO 對象不在隊上就不成立', () => {
    const l = cardLinks(b, team, DEFAULT_WEIGHTS);
    expect(l.buddy).toHaveLength(1);
    expect(l.duo).toEqual({ chara: 'Q', matched: false });
  });

  it('有角色但沒有技能的槽不算成立', () => {
    const c = mk('c', 'C', '', [['A', '']]);
    expect(cardLinks(c, [a, c], DEFAULT_WEIGHTS).buddy[0]?.matched).toBe(false);
  });

  it('沒有隊伍脈絡（null）時一律視為成立，只用來顯示對象', () => {
    const l = cardLinks(a, null, DEFAULT_WEIGHTS);
    expect(l.buddy.every((s) => s.matched)).toBe(true);
    expect(l.duo?.matched).toBe(true);
  });

  it('同角色兩張卡在隊上，對象只要角色在就成立', () => {
    const b2 = mk('b2', 'B', '', []);
    expect(cardLinks(a, [a, b, b2], DEFAULT_WEIGHTS).buddy[0]?.matched).toBe(true);
  });
});

describe('targetsOf：顯示用的對象清單', () => {
  const a = mk('a', 'A', 'B', [['B', 'ATKUP(中)'], ['C', 'HPUP(小)'], ['Z', 'ATKUP(小)']]);
  const b = mk('b', 'B', '', []);

  it('DUO 對象就是某個 buddy 時，旗幟標在它身上，不多出頭像', () => {
    const t = targetsOf(cardLinks(a, [a, b], DEFAULT_WEIGHTS));
    expect(t.map((x) => [x.chara, x.isDuo, x.lit])).toEqual([['B', true, true], ['C', false, false], ['Z', false, false]]);
    expect(t.find((x) => x.chara === 'B')?.score).toBe(4); // ATK 中 2 × 倍率 2
  });

  it('DUO 對象不在 buddy 裡（資料有 3 張這種卡），多放一個只有旗幟的頭像', () => {
    const x = mk('x', 'X', 'G', [['B', 'HPUP(小)']]);
    const t = targetsOf(cardLinks(x, [x, b], DEFAULT_WEIGHTS));
    expect(t.map((i) => [i.chara, i.isDuo])).toEqual([['B', false], ['G', true]]);
    expect(t[1]?.lit).toBe(false); // G 不在隊上
  });

  it('DUO 成立但該 buddy 槽沒技能：頭像仍亮起（因為 DUO 成立），但不給 buddy 分數', () => {
    const y = mk('y', 'Y', 'B', [['B', '']]);
    const t = targetsOf(cardLinks(y, [y, b], DEFAULT_WEIGHTS));
    expect(t[0]).toMatchObject({ chara: 'B', lit: true, isDuo: true, score: 0 });
  });
});

describe('explainTeam 與求解器分數一致', () => {
  it('小隊：成立數與分數總和等於 scoreTeam', () => {
    const a = mk('a', 'A', 'B', [['B', 'ATKUP(中)'], ['C', 'HPUP(小)']]);
    const b = mk('b', 'B', 'A', [['A', 'HPUP(中)']]);
    const team = [a, b];
    const total = totalsOf(explainTeam(team, DEFAULT_WEIGHTS));
    const score = scoreTeam(team.map((c) => prepareCard(c, true, DEFAULT_WEIGHTS)), 'duo');
    expect(total).toEqual({ duo: score.duo, buddy: score.buddy });
  });

  it('求解器輸出的每支隊伍都一致（隨機卡池）', () => {
    let s = 12345;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const chars = ['A', 'B', 'C', 'D', 'E', 'F'];
    const skills = ['', 'HPUP(小)', 'ATKUP(中)', 'HP&ATKUP(小)'];
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)] as T;
    const cards = Array.from({ length: 14 }, (_, i) =>
      mk(`c${i}`, pick(chars), rnd() < 0.8 ? pick(chars) : '', [[pick(chars), pick(skills)], [pick(chars), pick(skills)], [pick(chars), pick(skills)]]),
    );
    const pool = cards.map((c) => prepareCard(c, true, DEFAULT_WEIGHTS));
    for (const team of solveOwned(pool, 4, 'buddy', 8)) {
      expect(totalsOf(explainTeam(team.cards, DEFAULT_WEIGHTS))).toEqual({ duo: team.score.duo, buddy: team.score.buddy });
    }
  });
});
