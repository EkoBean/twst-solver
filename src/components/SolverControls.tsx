import { ELEMENTS } from '../data';
import { useT } from '../i18n';
import { patchStore, type Settings, type SolverMode } from '../settings';
import { useStore, type Store } from '../store';
import { DEFAULT_WEIGHTS, type CardTypePref, type Element, type RankPriority, type StatPriority, type Weights } from '../types';

export function weightsOf(s: Settings): Weights {
  return {
    statPriority: s.stat,
    primaryMultiplier: s.wMul,
    sizes: { ...DEFAULT_WEIGHTS.sizes, 小: s.wSmall, 中: s.wMid, 大: s.wBig },
    crit: { ...DEFAULT_WEIGHTS.crit, 小: s.wCritS, 中: s.wCritM },
    mutualDuo: s.wMutual,
    cardType: s.cardType,
    element: s.element,
    magic2Weight: s.wMagic2,
    magicOtherWeight: s.wMagicOther,
  };
}

function Segmented<T extends string>(props: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div class="field">
      <span class="field-label">{props.label}</span>
      <div class="seg" role="group" aria-label={props.label}>
        {props.options.map((o) => (
          <button key={o.value} type="button" class={`seg-btn${props.value === o.value ? ' on' : ''}`} onClick={() => props.onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField(props: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label class="field">
      <span class="field-label">{props.label}</span>
      <input
        type="number"
        min={0}
        step={props.step ?? 0.5}
        value={props.value}
        onChange={(e) => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          if (Number.isFinite(v) && v >= 0) props.onChange(v);
        }}
      />
    </label>
  );
}


/** 求解參數面板（模式、卡片設定、能力設定、權重）。「最優解」與「新卡效益」各傳自己的 store，設定互不影響。 */
export function SolverControls({ store }: { store: Store<Settings> }) {
  const { t } = useT();
  const s = useStore(store);
  const modes: { value: SolverMode; label: string }[] = [
    { value: '5', label: t('solver.mode.5') },
    { value: '4+1', label: t('solver.mode.4+1') },
  ];
  const types: { value: CardTypePref; label: string }[] = [
    { value: 'アタック', label: t('solver.cardType.attack') },
    { value: 'ディフェンス', label: t('solver.cardType.defense') },
    { value: 'バランス', label: t('solver.cardType.balance') },
  ];
  return (
    <>
        <h4 class="ctl-title">{t('solver.sec.mode')}</h4>
        <div class="controls">
          <Segmented<SolverMode> label={t('solver.mode')} value={s.mode} options={modes} onChange={(mode) => patchStore(store, { mode })} />
        </div>
        <p class="note">{t(`solver.mode.hint.${s.mode}` as 'solver.mode.hint.5')}</p>

        <h4 class="ctl-title">{t('solver.sec.card')}</h4>
        <div class="controls">
          <div class="field">
            <span class="field-label">{t('solver.element')}</span>
            <div class="chips">
              <button class={`chip${s.element === null ? ' on' : ''}`} onClick={() => patchStore(store, { element: null })}>
                {t('solver.element.any')}
              </button>
              {ELEMENTS.map((el: Element) => (
                <button key={el} class={`chip el-chip-${el}${s.element === el ? ' on' : ''}`} onClick={() => patchStore(store, { element: el })}>
                  {el}
                </button>
              ))}
            </div>
          </div>
          <Segmented<CardTypePref> label={t('solver.cardType')} value={s.cardType} options={types} onChange={(cardType) => patchStore(store, { cardType })} />
        </div>
        {s.element !== null && <p class="note">{t('solver.element.hint')}</p>}
        {s.cardType !== 'バランス' && <p class="note">{t('solver.cardType.hint')}</p>}

        <h4 class="ctl-title">{t('solver.sec.ability')}</h4>
        <div class="controls">
          <Segmented<RankPriority>
            label={t('solver.rank')}
            value={s.rank}
            options={[{ value: 'duo', label: t('solver.rank.duo') }, { value: 'buddy', label: t('solver.rank.buddy') }]}
            onChange={(rank) => patchStore(store, { rank })}
          />
          <Segmented<StatPriority>
            label={t('solver.stat')}
            value={s.stat}
            options={[{ value: 'ATK', label: 'ATK' }, { value: 'HP', label: 'HP' }, { value: 'BAL', label: 'Balance' }]}
            onChange={(stat) => patchStore(store, { stat })}
          />
        </div>

        <details class="weights">
          <summary>{t('solver.weights')}</summary>
          <div class="controls">
            <NumberField label={t('solver.weights.mul')} value={s.wMul} onChange={(wMul) => patchStore(store, { wMul })} />
            <NumberField label={t('solver.weights.small')} value={s.wSmall} onChange={(wSmall) => patchStore(store, { wSmall })} />
            <NumberField label={t('solver.weights.mid')} value={s.wMid} onChange={(wMid) => patchStore(store, { wMid })} />
            <NumberField label={t('solver.weights.big')} value={s.wBig} onChange={(wBig) => patchStore(store, { wBig })} />
            <NumberField label={t('solver.weights.critS')} value={s.wCritS} onChange={(wCritS) => patchStore(store, { wCritS })} />
            <NumberField label={t('solver.weights.critM')} value={s.wCritM} onChange={(wCritM) => patchStore(store, { wCritM })} />
            <NumberField label={t('solver.weights.magic2')} value={s.wMagic2} onChange={(wMagic2) => patchStore(store, { wMagic2 })} />
            <NumberField label={t('solver.weights.magicOther')} value={s.wMagicOther} onChange={(wMagicOther) => patchStore(store, { wMagicOther })} />
            <NumberField label={t('solver.weights.mutual')} value={s.wMutual} onChange={(wMutual) => patchStore(store, { wMutual })} />
          </div>
        </details>

    </>
  );
}
