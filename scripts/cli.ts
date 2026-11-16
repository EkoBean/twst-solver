// 用法：npm run cli [-- hand.json]
import { readFileSync } from 'node:fs';
import { buildPools, cardLabel } from '../src/data';
import { importHand, ownedNames, handStore } from '../src/handFile';
import { solveOwned, solveWithSupport } from '../src/solver';
import { DEFAULT_WEIGHTS, type Card, type Element, type RankPriority, type TeamResult } from '../src/types';

const handPath = process.argv[2] ?? 'samples/hand.json';
const cards = JSON.parse(readFileSync('public/data/chara.json', 'utf8')) as Card[];
importHand(JSON.parse(readFileSync(handPath, 'utf8')), new Set(cards.map((c) => c.name)));
const owned = ownedNames(handStore.get());

const fmt = (t: TeamResult) =>
  `DUO ${t.score.duo} / buddy ${t.score.buddy}  | ` +
  // support 固定放在最後一個位置（同一張卡可以同時在手牌和 support，所以不能用名字判斷）
  t.cards.map((c, i) => (t.supportName && i === t.cards.length - 1 ? `[support]${cardLabel(c)}` : cardLabel(c))).join(' , ');

for (const element of [null, '火'] as (Element | null)[]) {
  for (const rank of ['duo', 'buddy'] as RankPriority[]) {
    const pools = buildPools(cards, owned, { ...DEFAULT_WEIGHTS, statPriority: 'ATK' }, element);
    console.log(`\n=== 屬性:${element ?? '不限'} 排序:${rank}優先 手牌:${pools.owned.length}張 ===`);
    for (const size of [4, 5]) {
      const t0 = performance.now();
      const res = solveOwned(pools.owned, size, rank, 1);
      console.log(`[${size}張] ${(performance.now() - t0).toFixed(0)}ms`, res[0] ? fmt(res[0]) : '(手牌不足)');
    }
    const t0 = performance.now();
    const recs = solveWithSupport(pools.owned, pools.supports, rank, 2);
    console.log(`[4+1] ${(performance.now() - t0).toFixed(0)}ms`);
    for (const r of recs) console.log('   ', fmt(r.team));
  }
}
