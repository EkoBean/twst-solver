import { useEffect, useState } from 'preact/hooks';
import { HandTab } from './components/HandTab';
import { NewCardTab } from './components/NewCardTab';
import { SolverTab } from './components/SolverTab';
import { loadCatalog, type Catalog } from './data';
import { langStore, useT, type Lang } from './i18n';

type Tab = 'hand' | 'solver' | 'newcard';
const TABS: Tab[] = ['hand', 'solver', 'newcard'];

function readHash(): Tab {
  const h = location.hash.replace('#', '');
  return (TABS as string[]).includes(h) ? (h as Tab) : 'hand';
}

export function App() {
  const { t, lang } = useT();
  const [tab, setTab] = useState<Tab>(readHash());
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const on = () => setTab(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'ja' ? 'ja' : 'zh-Hant';
    document.title = t('app.title');
  }, [lang]);

  useEffect(() => {
    loadCatalog().then(setCatalog, () => setFailed(true));
  }, []);

  const go = (next: Tab) => {
    location.hash = next;
  };

  return (
    <div class="app">
      <header class="top">
        <div class="brand">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div class="lang" role="group" aria-label={t('lang.label')}>
          {(['ja', 'zh'] as Lang[]).map((l) => (
            <button key={l} class={`lang-btn${lang === l ? ' on' : ''}`} onClick={() => langStore.set(l)}>
              {l === 'ja' ? '日本語' : '中文'}
            </button>
          ))}
        </div>
      </header>

      <nav class="tabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} class={`tab${tab === id ? ' on' : ''}`} onClick={() => go(id)}>
            {t(`tab.${id}` as 'tab.hand')}
          </button>
        ))}
      </nav>

      <main>
        {failed && <p class="msg msg-err">{t('load.fail')}</p>}
        {!catalog && !failed && <p class="note">…</p>}
        {catalog && tab === 'hand' && <HandTab catalog={catalog} />}
        {catalog && tab === 'solver' && <SolverTab catalog={catalog} goHand={() => go('hand')} />}
        {catalog && tab === 'newcard' && <NewCardTab catalog={catalog} goHand={() => go('hand')} />}
      </main>

      <footer class="foot">
        <p>{t('footer.data')}</p>
        {catalog?.syncedAt && <p>{t('footer.sync', { date: catalog.syncedAt.slice(0, 10) })}</p>}
        <p>{t('footer.fan')}</p>
      </footer>
    </div>
  );
}
