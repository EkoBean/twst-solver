import { useMemo, useState } from 'preact/hooks';
import { buildPools, type Catalog } from '../data';
import { handStore, ownedNames } from '../handFile';
import { useT } from '../i18n';
import { settingsStore } from '../settings';
import { solveOwned, solveWithSupport } from '../solver';
import { useStore } from '../store';
import type { Card, TeamResult, Weights } from '../types';
import { SolverControls, weightsOf } from './SolverControls';
import { TeamCard } from './TeamCard';

type Output =
  | { kind: 'teams'; teams: TeamResult[]; weights: Weights; pool: number; need: number; ms: number }
  | { kind: 'support'; teams: TeamResult[]; supports: Card[]; weights: Weights; pool: number; need: number; ms: number };

export function SolverTab({ catalog, goHand }: { catalog: Catalog; goHand: () => void }) {
  const { t } = useT();
  const s = useStore(settingsStore);
  const doc = useStore(handStore);
  const [out, setOut] = useState<Output | null>(null);
  const [busy, setBusy] = useState(false);
  const owned = useMemo(() => ownedNames(doc), [doc]);

  if (owned.size === 0) {
    return (
      <section class="card empty-state">
        <p>{t('solver.noHand')}</p>
        <button class="btn btn-primary" onClick={goHand}>{t('solver.goHand')}</button>
      </section>
    );
  }

  function run() {
    setBusy(true);
    // 讓畫面先顯示「計算中」，再開始同步計算
    setTimeout(() => {
      const t0 = performance.now();
      const weights = weightsOf(s);
      const pools = buildPools(catalog.cards, owned, weights, s.element);
      const rank = s.rank;
      if (s.mode === '4+1') {
        const recs = solveWithSupport(pools.owned, pools.supports, rank, 15, undefined, weights.mutualDuo);
        setOut({ kind: 'support', teams: recs.map((r) => r.team), supports: recs.map((r) => r.support), weights, pool: pools.owned.length, need: 4, ms: performance.now() - t0 });
      } else {
        const need = Number(s.mode);
        setOut({ kind: 'teams', teams: solveOwned(pools.owned, need, rank, 10, undefined, weights.mutualDuo), weights, pool: pools.owned.length, need, ms: performance.now() - t0 });
      }
      setBusy(false);
    }, 30);
  }


  return (
    <div class="stack">
      <section class="card">
        <SolverControls store={settingsStore} />
        <div class="run-row">
          <button class="btn btn-primary" disabled={busy} onClick={run}>
            {busy ? t('solver.running') : t('solver.run')}
          </button>
          <span class="note">{t('solver.assume')}</span>
        </div>
      </section>

      {out && (
        <section class="stack" aria-live="polite">
          <p class="note">
            {t('solver.pool', { count: out.pool })} ・ {t('solver.time', { ms: out.ms.toFixed(0) })}
          </p>
          {out.teams.length === 0 && <p class="msg msg-warn">{t('solver.notEnough', { count: out.pool, need: out.need })}</p>}
          {out.teams.map((team, i) => (
            <TeamCard key={i} index={i + 1} team={team} isSupport={out.kind === 'support'} weights={out.weights} />
          ))}
        </section>
      )}
    </div>
  );
}
