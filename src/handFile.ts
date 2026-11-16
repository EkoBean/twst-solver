import { createStore } from './store';
import type { Card, HandEntry } from './types';

/**
 * 手牌文件。entries 以 cardName 為 key，內容是匯入檔的「原始物件」，
 * 不重新計算、不補欄位，匯出時原樣寫回（等級、突破等數值都保留）。
 */
export interface HandDoc {
  id: string;
  name: string;
  entries: Record<string, HandEntry>;
}

export const EMPTY_DOC: HandDoc = { id: '', name: '', entries: {} };
export const HAND_FORMAT = 'twst-hand-collection-sets-v1';

function isDoc(v: unknown): HandDoc | null {
  const o = v as Partial<HandDoc> | null;
  return o && typeof o === 'object' && typeof o.entries === 'object' && o.entries !== null
    ? { id: String(o.id ?? ''), name: String(o.name ?? ''), entries: o.entries }
    : null;
}

export const handStore = createStore<HandDoc>('twst-solver/hand/v1', EMPTY_DOC, isDoc);

const MAX_LEVEL: Record<string, number> = { R: 60, SR: 80, SSR: 100 };

/** 從本站挑選的卡：最高等級、0 突破、未解放 LB。 */
export function defaultEntry(card: Card): HandEntry {
  return {
    characterName: '',
    cardName: card.name,
    isOwned: true,
    level: MAX_LEVEL[card.rare] ?? 80,
    totsu: 0,
    isLimitBreak: false,
    isM3: false,
  };
}

export function toggleOwned(card: Card): void {
  handStore.set((doc) => {
    const prev = doc.entries[card.name];
    // 已有紀錄就只翻 isOwned，保留原本的等級與突破數值
    const next = prev ? { ...prev, isOwned: !prev.isOwned } : defaultEntry(card);
    return { ...doc, entries: { ...doc.entries, [card.name]: next } };
  });
}

export function clearHand(): void {
  handStore.set(EMPTY_DOC);
}

export function ownedNames(doc: HandDoc): Set<string> {
  const out = new Set<string>();
  for (const [key, e] of Object.entries(doc.entries)) if (e.isOwned === true) out.add(String(e.cardName ?? key));
  return out;
}

export interface ImportResult {
  ownedCount: number;
  multiSet: boolean;
  unknown: string[];
}

/** 解析 hand-collection 匯出檔。多組時取 activeSetId 那組。格式錯誤會丟例外。 */
export function importHand(json: unknown, knownCards: Set<string>): ImportResult {
  const obj = json as Record<string, unknown> | null;
  if (!obj || typeof obj !== 'object') throw new Error('not an object');

  let id = '';
  let name = '';
  let data: unknown;
  let multiSet = false;
  if (Array.isArray(obj.sets)) {
    const sets = obj.sets as Record<string, unknown>[];
    if (sets.length === 0) throw new Error('no sets');
    multiSet = sets.length > 1;
    const active = sets.find((s) => s.id === obj.activeSetId) ?? sets[0];
    id = String(active?.id ?? '');
    name = String(active?.name ?? '');
    data = active?.data;
  } else {
    data = obj; // 也接受單純的 { cardName: entry }
  }
  if (!data || typeof data !== 'object') throw new Error('no card data');

  const entries: Record<string, HandEntry> = {};
  for (const [key, raw] of Object.entries(data as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as HandEntry;
    const cardName = String(e.cardName ?? key);
    entries[cardName] = e; // 原樣保留
  }
  if (Object.keys(entries).length === 0) throw new Error('no card entries');

  handStore.set({ id, name, entries });
  const owned = ownedNames(handStore.get());
  return { ownedCount: owned.size, multiSet, unknown: [...owned].filter((n) => !knownCards.has(n)) };
}

/** 輸出成 hand-collection 能讀的格式（單組）。 */
export function exportHand(doc: HandDoc, now = new Date()): Record<string, unknown> {
  const id = doc.id || crypto.randomUUID();
  return {
    format: HAND_FORMAT,
    exportedAt: now.toISOString(),
    activeSetId: id,
    activeSlot: 1,
    sets: [{ id, name: doc.name || 'twst-solver', data: doc.entries, slot: 1 }],
  };
}

export function downloadJson(obj: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
