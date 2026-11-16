import { useMemo, useRef, useState } from 'preact/hooks';
import { ELEMENTS, type Catalog } from '../data';
import { clearHand, downloadJson, exportHand, handStore, importHand, ownedNames, toggleOwned } from '../handFile';
import { useT } from '../i18n';
import { patchSettings, settingsStore } from '../settings';
import { useStore } from '../store';
import { hasElement } from '../solver';
import { CardOverview } from './CardOverview';

const HAND_SITE = 'https://sz7m8ci7.github.io/twst/hand-collection';

interface Msg {
  kind: 'ok' | 'warn' | 'err';
  text: string;
}

export function HandTab({ catalog }: { catalog: Catalog }) {
  const { t } = useT();
  const doc = useStore(handStore);
  const s = useStore(settingsStore);
  const [msg, setMsg] = useState<Msg[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const owned = useMemo(() => ownedNames(doc), [doc]);
  const ownedKnown = useMemo(() => catalog.cards.filter((c) => owned.has(c.name)).length, [catalog, owned]);

  const visible = useMemo(
    () =>
      catalog.cards.filter(
        (c) =>
          (!s.onlyOwned || owned.has(c.name)) &&
          (s.handElement === null || hasElement(c, s.handElement)),
      ),
    [catalog, owned, s.onlyOwned, s.handElement],
  );

  async function readFile(file: File | undefined | null) {
    if (!file) return;
    try {
      const json: unknown = JSON.parse(await file.text());
      const r = importHand(json, new Set(catalog.byName.keys()));
      const out: Msg[] = [{ kind: 'ok', text: t('hand.import.ok', { count: r.ownedCount }) }];
      if (r.multiSet) out.push({ kind: 'warn', text: t('hand.import.multiSet') });
      if (r.unknown.length > 0) out.push({ kind: 'warn', text: t('hand.import.unknown', { count: r.unknown.length }) });
      setMsg(out);
    } catch (e) {
      setMsg([{ kind: 'err', text: t('hand.import.fail', { reason: (e as Error).message }) }]);
    }
  }

  function onReset() {
    if (window.confirm(t('hand.reset.confirm'))) {
      clearHand();
      setMsg([]);
    }
  }

  const hasHand = owned.size > 0;

  return (
    <div class="stack">
      <section class="card guide">
        <h2>{t('hand.guide.title')}</h2>
        <ol class="steps">
          <li>{t('hand.guide.step1')}</li>
          <li>{t('hand.guide.step2')}</li>
          <li>{t('hand.guide.step3')}</li>
        </ol>
        <a class="btn btn-ghost" href={HAND_SITE} target="_blank" rel="noopener noreferrer">
          {t('hand.guide.link')}
        </a>
        <p class="note">{t('hand.guide.note')}</p>
      </section>

      <section class="card">
        <label
          class={`drop${dragging ? ' drag' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void readFile(e.dataTransfer?.files[0]);
          }}
        >
          <span class="drop-icon" aria-hidden="true">⇪</span>
          <span>{t('hand.import.drop')}</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void readFile((e.target as HTMLInputElement).files?.[0]);
              (e.target as HTMLInputElement).value = '';
            }}
          />
        </label>
        {msg.map((m, i) => (
          <p key={i} class={`msg msg-${m.kind}`} role={m.kind === 'err' ? 'alert' : 'status'}>
            {m.text}
          </p>
        ))}
      </section>

      <section class="card">
        <div class="toolbar">
          <div class="stat">
            <strong>{t('hand.stats', { owned: ownedKnown, total: catalog.cards.length })}</strong>
          </div>
          <label class="check">
            <input
              type="checkbox"
              checked={s.onlyOwned}
              onChange={(e) => patchSettings({ onlyOwned: (e.target as HTMLInputElement).checked })}
            />
            <span>{t('hand.filter.onlyOwned')}</span>
          </label>
          <div class="spacer" />
          <button class="btn" disabled={!hasHand} onClick={() => downloadJson(exportHand(doc), `twst-hand-${new Date().toISOString().slice(0, 10)}.json`)}>
            {t('hand.export')}
          </button>
          <button class="btn btn-danger" disabled={!hasHand} onClick={onReset}>
            {t('hand.reset')}
          </button>
        </div>

        <div class="filters">
          <div class="chips" role="group" aria-label={t('hand.filter.element')}>
            <button class={`chip${s.handElement === null ? ' on' : ''}`} onClick={() => patchSettings({ handElement: null })}>
              {t('hand.filter.all')}
            </button>
            {ELEMENTS.map((el) => (
              <button
                key={el}
                class={`chip el-chip-${el}${s.handElement === el ? ' on' : ''}`}
                onClick={() => patchSettings({ handElement: el })}
              >
                {el}
              </button>
            ))}
          </div>
        </div>

        <p class="note">{s.onlyOwned ? t('hand.hint.readonly') : t('hand.hint.edit')}</p>

        {visible.length === 0 ? (
          <p class="empty">{t('hand.empty')}</p>
        ) : (
          <CardOverview
            cards={visible}
            isLit={(c) => owned.has(c.name)}
            onSelect={s.onlyOwned ? undefined : toggleOwned}
          />
        )}
        <p class="note">{t('hand.exportNote')}</p>
      </section>
    </div>
  );
}
