import { createStore, type Store } from './store';
import type { Element, RankPriority, StatPriority } from './types';

export type SolverMode = '4' | '5' | '4+1';

export interface Settings {
  // 手牌設定頁
  onlyOwned: boolean;
  handElement: Element | null;
  // 最優解頁
  mode: SolverMode;
  element: Element | null;
  rank: RankPriority;
  stat: StatPriority;
  wMul: number;
  wSmall: number;
  wMid: number;
  wBig: number;
  wCritS: number;
  wCritM: number;
  wMutual: number;
}

export const DEFAULT_SETTINGS: Settings = {
  onlyOwned: true,
  handElement: null,
  mode: '4+1',
  element: null,
  rank: 'duo',
  stat: 'ATK',
  wMul: 2,
  wSmall: 1,
  wMid: 2,
  wBig: 3,
  wCritS: 0.5,
  wCritM: 1,
  wMutual: 0.5,
};

export const settingsStore = createStore<Settings>('twst-solver/settings/v1', DEFAULT_SETTINGS, (v) =>
  v && typeof v === 'object' ? { ...DEFAULT_SETTINGS, ...(v as Partial<Settings>) } : null,
);

export function patchSettings(patch: Partial<Settings>): void {
  settingsStore.set((s) => ({ ...s, ...patch }));
}

/** 新卡效益頁自己的一份參數：和「現有隊伍最優解」互不影響。 */
export const newCardSettingsStore = createStore<Settings>('twst-solver/newcard-settings/v1', DEFAULT_SETTINGS, (v) =>
  v && typeof v === 'object' ? { ...DEFAULT_SETTINGS, ...(v as Partial<Settings>) } : null,
);

export function patchStore(store: Store<Settings>, patch: Partial<Settings>): void {
  store.set((s) => ({ ...s, ...patch }));
}
