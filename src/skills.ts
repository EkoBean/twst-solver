import type { Weights } from './types';

const STAT_RE = /^(HPUP|ATKUP)\((極小|小|中|大)\)$/;
const CRIT_RE = /^クリティカル\((小|中|大)\)$/;

/**
 * 把 buddy 技能字串換成分數。
 * 例：'HP&ATKUP(小)' 是「HP 小 + ATK 小」，要先展開成 'HPUP(小)&ATKUP(小)'，
 * 否則用 '&' 切開會把它切壞。不認得的效果（無効、ダメージUP 等）不計分。
 */
export function parseSkill(raw: string, w: Weights): number {
  if (!raw) return 0;
  // 把 'HP&ATKUP(x)' 展開成兩個獨立 token，大小共用同一個 (x)
  const expanded = raw.replace(/HP&ATKUP\((極小|小|中|大)\)/g, 'HPUP($1)&ATKUP($1)');
  let total = 0;
  for (const token of expanded.split('&')) {
    const stat = STAT_RE.exec(token);
    if (stat) {
      const isPrimary = w.statPriority !== 'BAL' && (stat[1] === 'HPUP') === (w.statPriority === 'HP');
      const size = w.sizes[stat[2] as keyof Weights['sizes']];
      total += isPrimary ? size * w.primaryMultiplier : size;
      continue;
    }
    const crit = CRIT_RE.exec(token);
    if (crit) total += w.crit[crit[1] as keyof Weights['crit']];
  }
  return total;
}
