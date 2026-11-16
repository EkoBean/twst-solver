import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { cardLabel } from '../data';
import type { Card } from '../types';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg';

interface Props {
  card: Card;
  lit?: boolean;
  size?: IconSize;
  onClick?: () => void;
  highlight?: boolean;
  /** 隱藏左上的魔法屬性小點（用卡來代表「角色」時，那些屬性不屬於角色，所以要藏起來） */
  hideElements?: boolean;
  children?: ComponentChildren;
}

const ELEMENT_CLASS: Record<string, string> = { 火: 'fire', 水: 'water', 木: 'wood', 無: 'none' };

/** 最底層的卡面圖示（圖 + 屬性小點），沒有 tooltip。圖載入失敗時顯示角色名前兩字。 */
export function CardIcon({ card, lit = true, size = 'md', onClick, highlight, hideElements, children }: Props) {
  const [broken, setBroken] = useState(false);
  const label = cardLabel(card);
  const magics = [card.magic1atr, card.magic2atr, card.magic3atr].slice(0, card.rare === 'SSR' ? 3 : 2);
  const cls = `tile tile-${size} rare-${card.rare} ${lit ? 'lit' : 'dim'}${highlight ? ' highlight' : ''}`;
  const body = (
    <>
      {broken ? (
        <span class="noimg" aria-hidden="true">{card.chara.slice(0, 2)}</span>
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}icons/${card.name}.webp`}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      {!hideElements && (
        <span class="elems" aria-hidden="true">
          {magics.map((m, i) => (
            <i key={i} class={`el el-${ELEMENT_CLASS[m] ?? 'none'}`} />
          ))}
        </span>
      )}
      {children}
    </>
  );
  return onClick ? (
    <button type="button" class={cls} aria-label={label} aria-pressed={lit} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div class={cls} role="img" aria-label={label}>
      {body}
    </div>
  );
}
