import { readFileSync, existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearHand, defaultEntry, exportHand, handStore, importHand, ownedNames, toggleOwned } from './handFile';
import type { Card } from './types';

const card = (name: string, rare = 'SSR'): Card =>
  ({ name, chara: 'X', costume: 'y', rare, attr: '', duo: '', buddy1c: '', buddy2c: '', buddy3c: '',
    buddy1s: '', buddy2s: '', buddy3s: '', buddy1s_totsu: '', buddy2s_totsu: '', buddy3s_totsu: '',
    magic1atr: '火', magic2atr: '水', magic3atr: '木' }) as Card;

const sample = {
  format: 'twst-hand-collection-sets-v1',
  activeSetId: 'b',
  sets: [
    { id: 'a', name: 'A', slot: 1, data: { x: { cardName: 'x', isOwned: true, level: 90, totsu: 3, isLimitBreak: false, isM3: true, extra: 'keep' } } },
    { id: 'b', name: 'B', slot: 2, data: { y: { cardName: 'y', isOwned: true, level: 120, totsu: 4, isLimitBreak: true, isM3: true }, z: { cardName: 'z', isOwned: false, level: 10 } } },
  ],
};

beforeEach(() => clearHand());

describe('importHand / exportHand', () => {
  it('多組時只取使用中的那組，並回報 multiSet', () => {
    const r = importHand(sample, new Set(['y', 'z']));
    expect(r.multiSet).toBe(true);
    expect(r.ownedCount).toBe(1);
    expect([...ownedNames(handStore.get())]).toEqual(['y']);
  });

  it('匯入後原始數值原樣保留（含未知欄位），匯出再讀回一致', () => {
    importHand(sample, new Set());
    const out = exportHand(handStore.get()) as { sets: { data: Record<string, unknown> }[] };
    expect(out.sets[0]?.data).toEqual(sample.sets[1]?.data);
    importHand(out, new Set());
    expect(handStore.get().entries).toEqual(sample.sets[1]?.data);
  });

  it('資料庫找不到的卡仍保留，並列在 unknown', () => {
    const r = importHand(sample, new Set(['z']));
    expect(r.unknown).toEqual(['y']);
    expect(handStore.get().entries['y']).toBeDefined();
  });

  it('壞檔丟例外，且不覆蓋現有手牌', () => {
    importHand(sample, new Set());
    expect(() => importHand({ sets: [] }, new Set())).toThrow();
    expect(() => importHand('nope', new Set())).toThrow();
    expect(ownedNames(handStore.get()).size).toBe(1);
  });

  it('真實手牌檔可匯入並完整往返', () => {
    const p = 'samples/hand.json';
    if (!existsSync(p)) return;
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    importHand(raw, new Set());
    const out = exportHand(handStore.get()) as { sets: { data: unknown }[] };
    expect(out.sets[0]?.data).toEqual(raw.sets[0].data);
  });
});

describe('toggleOwned', () => {
  it('新增的卡寫入最高等級、0 突破', () => {
    toggleOwned(card('n1', 'R'));
    toggleOwned(card('n2', 'SR'));
    toggleOwned(card('n3', 'SSR'));
    const e = handStore.get().entries;
    expect([e['n1']?.level, e['n2']?.level, e['n3']?.level]).toEqual([60, 80, 100]);
    expect(e['n3']).toMatchObject({ totsu: 0, isLimitBreak: false, isM3: false, isOwned: true });
    expect(defaultEntry(card('q'))).toMatchObject({ cardName: 'q' });
  });

  it('取消再勾選，保留匯入時的原始數值', () => {
    importHand(sample, new Set());
    toggleOwned(card('y'));
    expect(ownedNames(handStore.get()).has('y')).toBe(false);
    toggleOwned(card('y'));
    expect(handStore.get().entries['y']).toMatchObject({ level: 120, totsu: 4, isLimitBreak: true });
  });
});
