import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cardLabel } from '../data';
import { cardLinks, targetsOf } from '../explain';
import { useT } from '../i18n';
import { DEFAULT_WEIGHTS, type Card, type Weights } from '../types';
import { CardIcon } from './CardIcon';
import { TargetAvatar } from './TargetAvatar';

interface Props {
  card: Card;
  /** 亮起（持有）或變暗 */
  lit?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  highlight?: boolean;
  /** 滑過時顯示 DUO / buddy 對象的小頭像。預設開啟。 */
  tooltip?: boolean;
  /**
   * 這張卡所在的隊伍。傳入時，tooltip 裡「在隊上的對象」亮起、不在的變暗，
   * 並用隊上同角色的那張卡當頭像。不傳就只顯示對象是誰（全部亮起）。
   */
  team?: Card[];
  /** 計算 buddy 分數用的權重（決定哪些槽算成立）。預設為預設權重 */
  weights?: Weights;
  children?: ComponentChildren;
}

/**
 * 卡面頭像：只有圖，名稱與 DUO / buddy 對象放在滑過／聚焦時的 tooltip。
 * 手牌總覽、隊伍結果、之後的新卡頁都用這一個元件。
 */
export function CardTile({ card, lit = true, size = 'md', onClick, highlight, tooltip = true, team, weights = DEFAULT_WEIGHTS, children }: Props) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ dx: 0, below: false });
  const tipRef = useRef<HTMLDivElement>(null);

  // tooltip 顯示後量一次位置：左右超出畫面就平移，上方放不下就改放下方
  useLayoutEffect(() => {
    if (!show || !tipRef.current) return;
    const r = tipRef.current.getBoundingClientRect();
    const pad = 8;
    let dx = 0;
    if (r.left < pad) dx = pad - r.left;
    else if (r.right > window.innerWidth - pad) dx = window.innerWidth - pad - r.right;
    setPos({ dx, below: r.top < pad });
  }, [show]);

  const open = () => tooltip && setShow(true);
  const close = () => {
    setShow(false);
    setPos({ dx: 0, below: false });
  };

  const teamCardOf = (chara: string) => team?.find((c) => c.chara === chara);

  let tipNode = null;
  if (show) {
    const targets = targetsOf(cardLinks(card, team ?? null, weights));
    tipNode = (
      <div ref={tipRef} role="tooltip" class={`tip${pos.below ? ' below' : ''}`} style={{ '--dx': `${pos.dx}px` }}>
        <div class="tip-title">{cardLabel(card)}</div>
        <div class="tip-group">
          <div class="tip-avatars">
            {targets.length === 0 && <span class="tip-none">{t('tip.none')}</span>}
            {targets.map((x, i) => (
              <TargetAvatar
                key={i}
                size="xs"
                chara={x.chara}
                lit={x.lit}
                card={x.lit ? teamCardOf(x.chara) : undefined}
                flag={x.isDuo ? t('tip.duoFlag') : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <span class={`tile-host host-${size}`} onMouseEnter={open} onMouseLeave={close} onFocusIn={open} onFocusOut={close}>
      <CardIcon card={card} lit={lit} size={size} onClick={onClick} highlight={highlight}>
        {children}
      </CardIcon>
      {tipNode}
    </span>
  );
}
