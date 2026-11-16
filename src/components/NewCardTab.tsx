import { useMemo, useState } from 'preact/hooks';
import { buildPools, cardLabel, type Catalog } from '../data';
import { handStore, ownedNames } from '../handFile';
import { useT } from '../i18n';
import { newCardSettingsStore } from '../settings';
import { prepareCard, hasElement, solveOwned, solveWithSupport } from '../solver';
import { useStore } from '../store';
import type { Card, CardTypePref, Element, TeamResult } from '../types';
import { CardTile } from './CardTile';
import { CharaPicker } from './CharaPicker';
import { Collapse } from './Collapse';
import { TeamCard } from './TeamCard';
import { SolverControls, weightsOf } from './SolverControls';

type Source = 'pick' | 'manual';
type Size = '' | '極小' | '小' | '中' | '大';
type Crit = '' | '小' | '中' | '大';

interface Slot {
  chara: string;
  hp: Size;
  atk: Size;
  crit: Crit;
}

const NEW_NAME = '__new_card__';
const SIZES: Size[] = ['極小', '小', '中', '大'];
const CRITS: Crit[] = ['小', '中', '大'];
const ELEMS: Element[] = ['火', '水', '木', '無'];
const TYPE_OPTIONS: [CardTypePref, 'solver.cardType.attack' | 'solver.cardType.defense' | 'solver.cardType.balance'][] = [
  ['アタック', 'solver.cardType.attack'],
  ['ディフェンス', 'solver.cardType.defense'],
  ['バランス', 'solver.cardType.balance'],
];
const emptySlot = (): Slot => ({ chara: '', hp: '', atk: '', crit: '' });

/** 把 HP / ATK / クリティカル 三個下拉選單組回 buddy 技能字串，格式與 chara.json 相同。 */
function skillString(s: Slot): string {
  const parts: string[] = [];
  if (s.hp) parts.push(`HPUP(${s.hp})`);
  if (s.atk) parts.push(`ATKUP(${s.atk})`);
  if (s.crit) parts.push(`クリティカル(${s.crit})`);
  return parts.join('&');
}

interface Result {
  card: Card;
  /** 一定包含這張卡的最佳隊伍（由高到低） */
  teams: TeamResult[];
  /** 沒有這張卡時的最佳隊伍，比較用 */
  before: TeamResult | null;
  filtered: boolean;
}

export function NewCardTab({ catalog, goHand }: { catalog: Catalog; goHand: () => void }) {
  const { t } = useT();
  const s = useStore(newCardSettingsStore);
  const doc = useStore(handStore);
  const owned = useMemo(() => ownedNames(doc), [doc]);
  const charas = useMemo(() => [...new Set(catalog.cards.map((c) => c.chara))], [catalog]);

  const [source, setSource] = useState<Source>('pick');
  const [pickChara, setPickChara] = useState('');
  const [pickName, setPickName] = useState('');
  const [cardOpen, setCardOpen] = useState(false);
  const [mChara, setMChara] = useState('');
  const [mElems, setMElems] = useState<(Element | '')[]>(['', '', '']);
  const [mDuo, setMDuo] = useState('');
  const [mType, setMType] = useState<CardTypePref>('バランス');
  const [slots, setSlots] = useState<Slot[]>([emptySlot(), emptySlot(), emptySlot()]);
  const [out, setOut] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  if (owned.size === 0) {
    return (
      <section class="card empty-state">
        <p>{t('solver.noHand')}</p>
        <button class="btn btn-primary" onClick={goHand}>{t('solver.goHand')}</button>
      </section>
    );
  }

  const pickCards = catalog.cards.filter((c) => c.chara === pickChara);
  const picked = source === 'pick' ? catalog.byName.get(pickName) : undefined;
  const canRun = source === 'pick' ? !!picked : !!mChara;

  function manualCard(): Card {
    const sk = slots.map(skillString);
    return {
      name: NEW_NAME,
      chara: mChara,
      costume: 'NEW',
      rare: 'SSR',
      attr: mType,
      duo: mDuo,
      buddy1c: slots[0]?.chara ?? '',
      buddy2c: slots[1]?.chara ?? '',
      buddy3c: slots[2]?.chara ?? '',
      buddy1s: sk[0] ?? '',
      buddy2s: sk[1] ?? '',
      buddy3s: sk[2] ?? '',
      buddy1s_totsu: sk[0] ?? '',
      buddy2s_totsu: sk[1] ?? '',
      buddy3s_totsu: sk[2] ?? '',
      magic1atr: mElems[0] ?? '',
      magic2atr: mElems[1] ?? '',
      magic3atr: mElems[2] ?? '',
    };
  }

  function run() {
    const card = source === 'pick' ? picked : manualCard();
    if (!card) return;
    setBusy(true);
    setTimeout(() => {
      const weights = weightsOf(s);
      // 基準：手牌扣掉這張卡（它若已持有，效益就是「有它」比「沒有它」多多少）
      const without = new Set(owned);
      without.delete(card.name);
      const pools = buildPools(catalog.cards, without, weights, s.element);
      const filtered = s.element !== null && !hasElement(card, s.element);
      const mutual = weights.mutualDuo;
      let teams: TeamResult[] = [];
      let before: TeamResult | null = null;
      if (!filtered) {
        const fixed = prepareCard(card, true, weights);
        if (s.mode === '4+1') {
          teams = solveWithSupport(pools.owned, pools.supports, s.rank, 8, fixed, mutual).map((r) => r.team);
          before = solveWithSupport(pools.owned, pools.supports, s.rank, 1, undefined, mutual)[0]?.team ?? null;
        } else {
          const size = Number(s.mode);
          teams = solveOwned(pools.owned, size, s.rank, 5, fixed, mutual);
          before = solveOwned(pools.owned, size, s.rank, 1, undefined, mutual)[0] ?? null;
        }
      }
      setOut({ card, teams, before, filtered });
      setBusy(false);
    }, 30);
  }

  const setSlot = (i: number, patch: Partial<Slot>) =>
    setSlots((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div class="stack">
      <section class="card">
        <h2>{t('new.title')}</h2>
        <p class="note">{t('new.desc')}</p>

        <div class="controls">
          <div class="field">
            <div class="seg" role="group">
              {(['pick', 'manual'] as Source[]).map((v) => (
                <button key={v} type="button" class={`seg-btn${source === v ? ' on' : ''}`} onClick={() => setSource(v)}>
                  {t(`new.source.${v}` as 'new.source.pick')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {source === 'pick' ? (
          <div class="pick-stack">
            <CharaPicker
              title={t('new.pick.chara')}
              charas={charas}
              value={pickChara}
              defaultOpen
              onChange={(c) => {
                if (c !== pickChara) setPickName('');
                setPickChara(c);
                setCardOpen(true);
              }}
            />
            {pickChara && (
              <Collapse
                open={cardOpen}
                onToggle={setCardOpen}
                title={t('new.pick.card')}
                summary={picked ? <span class="pick-sum"><CardTile card={picked} size="sm" tooltip={false} /><span class="pick-cap-inline">{cardLabel(picked)}</span></span> : undefined}
              >
                <div class="pick-grid pick-cards">
                  {pickCards.map((c) => (
                    <div key={c.name} class="pick-card">
                      <CardTile
                        card={c}
                        size="md"
                        highlight={c.name === pickName}
                        onClick={() => {
                          setPickName(c.name);
                          setCardOpen(false);
                        }}
                      >
                        {owned.has(c.name) && <span class="own-mark" aria-label="owned">✓</span>}
                      </CardTile>
                      <span class="pick-cap">{c.costume}</span>
                    </div>
                  ))}
                </div>
              </Collapse>
            )}
          </div>
        ) : (
          <>
            <p class="note">{t('new.manual.hint')}</p>
            <div class="pick-stack">
              <CharaPicker title={t('new.field.chara')} charas={charas} value={mChara} onChange={setMChara} />
              <div class="field">
                <span class="field-label">{t('new.field.element')}</span>
                <div class="elem-row">
                  {mElems.map((el, i) => (
                    <select
                      key={i}
                      value={el}
                      aria-label={`${t('new.field.element')} ${i + 1}`}
                      onChange={(e) => setMElems((all) => all.map((x, j) => (j === i ? ((e.target as HTMLSelectElement).value as Element | '') : x)))}
                    >
                      <option value="">{t('new.field.skip')}</option>
                      {ELEMS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  ))}
                </div>
              </div>
              <div class="field">
                <span class="field-label">{t('new.field.cardType')}</span>
                <div class="seg" role="group">
                  {TYPE_OPTIONS.map(([v, k]) => (
                    <button key={v} type="button" class={`seg-btn${mType === v ? ' on' : ''}`} onClick={() => setMType(v)}>
                      {t(k).replace(/（.*）/, '')}
                    </button>
                  ))}
                </div>
              </div>
              <CharaPicker title={t('new.field.duo')} charas={charas} value={mDuo} onChange={setMDuo} noneLabel={t('new.field.none')} />
            </div>
            <div class="slot-rows">
              {slots.map((sl, i) => (
                <div class="slot-row" key={i}>
                  <div class="slot-chara">
                    <CharaPicker
                      title={t('new.field.buddy', { n: i + 1 })}
                      charas={charas}
                      value={sl.chara}
                      onChange={(c) => setSlot(i, { chara: c })}
                      noneLabel={t('new.field.none')}
                    />
                  </div>
                  <label class="field">
                    <span class="field-label">{t('new.field.hp')}</span>
                    <select value={sl.hp} onChange={(e) => setSlot(i, { hp: (e.target as HTMLSelectElement).value as Size })}>
                      <option value="">{t('new.field.skip')}</option>
                      {SIZES.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">{t('new.field.atk')}</span>
                    <select value={sl.atk} onChange={(e) => setSlot(i, { atk: (e.target as HTMLSelectElement).value as Size })}>
                      <option value="">{t('new.field.skip')}</option>
                      {SIZES.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">{t('new.field.crit')}</span>
                    <select value={sl.crit} onChange={(e) => setSlot(i, { crit: (e.target as HTMLSelectElement).value as Crit })}>
                      <option value="">{t('new.field.skip')}</option>
                      {CRITS.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </>
        )}

        {picked && owned.has(picked.name) && <p class="msg">{t('new.pick.owned')}</p>}
        <h3 class="sub-title">{t('new.settings.title')}</h3>
        <SolverControls store={newCardSettingsStore} />
        <div class="run-row">
          <button class="btn btn-primary" disabled={busy || !canRun} onClick={run}>
            {busy ? t('solver.running') : t('new.run')}
          </button>
          {!canRun && <span class="note">{t('new.pick.empty')}</span>}
        </div>
      </section>

      {out && <ResultView out={out} weights={weightsOf(s)} el={s.element} />}
    </div>
  );
}

function ResultView({ out, weights, el }: { out: Result; weights: ReturnType<typeof weightsOf>; el: Element | null }) {
  const { t } = useT();
  const { before, teams, card } = out;
  if (out.filtered) return <p class="msg msg-warn">{t('new.filtered', { el: el ?? '' })}</p>;
  if (teams.length === 0) return <p class="msg msg-warn">{t('new.teams.none')}</p>;

  const top = teams[0] as TeamResult;
  const dDuo = top.score.duo - (before?.score.duo ?? 0);
  const dBuddy = top.score.buddy - (before?.score.buddy ?? 0);
  const improved = !before || top.score.total > before.score.total;
  const fmt = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n * 100) / 100}`;
  const support = (r: TeamResult) => r.supportName !== undefined;

  return (
    <section class="stack" aria-live="polite">
      <h3 class="sub-title">{t('new.after')}</h3>
      {teams.map((team, i) => (
        <TeamCard key={i} index={i + 1} team={team} isSupport={support(team)} weights={weights} markName={card.name} />
      ))}

      <div class="card gain">
        <span class="gain-title">{t('new.gain')}</span>
        {before ? (
          <>
            <span class="pill pill-duo">{t('solver.score.duo')} <b>{fmt(dDuo)}</b></span>
            <span class="pill pill-buddy">{t('solver.score.buddy')} <b>{fmt(dBuddy)}</b></span>
            {!improved && <span class="note">{t('new.gain.none')}</span>}
          </>
        ) : (
          <span class="note">{t('new.noBase')}</span>
        )}
      </div>
      {before && <TeamCard label={t('new.before')} team={before} isSupport={support(before)} weights={weights} />}
    </section>
  );
}
