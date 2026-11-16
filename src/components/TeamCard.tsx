import { useState } from 'preact/hooks';
import { explainTeam, targetsOf, type CardLinks } from '../explain';
import { useT } from '../i18n';
import { mutualPairs } from '../solver';
import type { TeamResult, Weights } from '../types';
import { CardTile } from './CardTile';
import { TargetAvatar } from './TargetAvatar';

interface Props {
  index?: number;
  /** 取代 #序號 的標題（例如「現在的最佳」） */
  label?: string;
  /** 這張卡（用 name 比對）會被標示為「新卡」 */
  markName?: string;
  team: TeamResult;
  isSupport: boolean;
  /** 計算當下使用的權重，說明的分數才會和上面的數字一致 */
  weights: Weights;
}

/** 一支推薦隊伍：頭像一排，右上有「詳細」按鈕，展開後看每張卡的 buddy／DUO 對象。 */
export function TeamCard({ index, label, markName, team, isSupport, weights }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const links = explainTeam(team.cards, weights);
  const mutual = weights.mutualDuo > 0 ? mutualPairs(team.cards) : [];

  return (
    <article class="team card">
      <header class="team-head">
        <span class="rank">{label ?? `#${index}`}</span>
        <span class="pill pill-duo">{t('solver.score.duo')} <b>{team.score.duo}</b></span>
        <span class="pill pill-buddy">{t('solver.score.buddy')} <b>{team.score.buddy}</b></span>
        <span class="spacer" />
        <button type="button" class="btn btn-small detail-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {t('team.detail.toggle')}
        </button>
      </header>

      <div class="team-cards">
        {team.cards.map((c, i) => {
          const support = isSupport && i === team.cards.length - 1;
          const marked = markName !== undefined && c.name === markName;
          return (
            <div key={i} class={`slot${support ? ' slot-support' : ''}`}>
              <CardTile card={c} size="lg" highlight={support || marked} team={team.cards} weights={weights} />
              {support && <span class="slot-badge">{t('solver.support')}</span>}
              {marked && !support && <span class="slot-badge">{t('new.badge')}</span>}
            </div>
          );
        })}
      </div>

      {open && (
        <section class="detail" aria-label={t('team.detail')}>
          <div class="cols">
            {links.map((l, i) => (
              <CardColumn key={i} links={l} team={team} support={(isSupport && i === links.length - 1) || l.card.name === markName} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

/** 一張卡一欄：上面是這張卡，下面橫排它的 buddy 對象（成立的亮起），DUO 對象右上角掛小旗幟。 */
function CardColumn({ links, team, support }: { links: CardLinks; team: TeamResult; support: boolean }) {
  const { t } = useT();
  const teamCardOf = (chara: string) => team.cards.find((c) => c.chara === chara);
  return (
    <div class="col">
      <div class="col-card">
        <CardTile card={links.card} size="lg" tooltip={false} highlight={support} />
      </div>
      <div class="col-targets">
        {targetsOf(links).map((x, i) => (
          <TargetAvatar
            key={i}
            chara={x.chara}
            lit={x.lit}
            card={x.lit ? teamCardOf(x.chara) : undefined}
            flag={x.isDuo ? t('tip.duoFlag') : undefined}
            sub={x.score > 0 ? `+${x.score}` : undefined}
            hint={x.skill || undefined}
          />
        ))}
      </div>
    </div>
  );
}
