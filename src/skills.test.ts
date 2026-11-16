import { describe, expect, it } from 'vitest';
import { parseSkill } from './skills';
import { DEFAULT_WEIGHTS, type Weights } from './types';

const atk: Weights = { ...DEFAULT_WEIGHTS, statPriority: 'ATK' };
const hp: Weights = { ...DEFAULT_WEIGHTS, statPriority: 'HP' };

describe('parseSkill', () => {
  it('空字串是 0 分', () => {
    expect(parseSkill('', atk)).toBe(0);
  });

  it('優先的那一項乘上倍率', () => {
    expect(parseSkill('ATKUP(中)', atk)).toBe(4); // 中=2 × 2
    expect(parseSkill('ATKUP(中)', hp)).toBe(2);
    expect(parseSkill('HPUP(中)', hp)).toBe(4);
    expect(parseSkill('HPUP(中)', atk)).toBe(2);
  });

  it('HP&ATKUP(小) 是兩項各一個小', () => {
    expect(parseSkill('HP&ATKUP(小)', atk)).toBe(3); // HP 1 + ATK 1×2
    expect(parseSkill('HP&ATKUP(小)', hp)).toBe(3);
  });

  it('クリティカル 額外加分，且不吃優先倍率', () => {
    expect(parseSkill('ATKUP(中)&クリティカル(小)', atk)).toBe(4.5);
    expect(parseSkill('HPUP(中)&クリティカル(中)', hp)).toBe(5);
  });

  it('不認得的效果不計分', () => {
    expect(parseSkill('HPUP(中)&暗闇無効', atk)).toBe(2);
    expect(parseSkill('HPUP(中)&水属性ダメージUP(大)', atk)).toBe(2);
    expect(parseSkill('ATKUP(小)&ダメージUP(中)', atk)).toBe(2);
  });

  it('HPUP(中)&ATKUP(小) 這種分開寫的也能算', () => {
    expect(parseSkill('HPUP(中)&ATKUP(小)', atk)).toBe(4); // HP 2 + ATK 1×2
  });
});

describe('Balance：HP 與 ATK 權重相同', () => {
  it('不套用優先倍率', async () => {
    const { DEFAULT_WEIGHTS } = await import('./types');
    const w = { ...DEFAULT_WEIGHTS, statPriority: 'BAL' as const };
    expect(parseSkill('HPUP(中)', w)).toBe(parseSkill('ATKUP(中)', w));
    expect(parseSkill('HPUP(中)', w)).toBe(DEFAULT_WEIGHTS.sizes.中);
  });
});
