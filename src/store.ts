import { useEffect, useState } from 'preact/hooks';

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: () => void): () => void;
}

/**
 * 簡單的 localStorage 持久化 store。
 * 用 localStorage 而不是 cookie：cookie 上限約 4KB 且每次請求都會送出，
 * 手牌檔動輒 20KB 以上放不下。讀寫失敗（無痕模式等）時退回記憶體。
 */
export function createStore<T>(key: string, initial: T, validate?: (v: unknown) => T | null): Store<T> {
  let state = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const ok = validate ? validate(parsed) : (parsed as T);
      if (ok !== null) state = ok;
    }
  } catch {
    /* 讀不到就用初始值 */
  }
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* 寫不進去就只留在記憶體 */
      }
      subs.forEach((f) => f());
    },
    subscribe(fn) {
      subs.add(fn);
      return () => void subs.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  const [value, setValue] = useState(store.get());
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(() => setValue(store.get()));
  }, [store]);
  return value;
}
