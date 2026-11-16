import { RARITIES } from '../data';
import type { Card } from '../types';
import { CardTile } from './CardTile';

interface Props {
  cards: Card[];
  /** 亮起（持有）判斷 */
  isLit: (card: Card) => boolean;
  /** 有給才可點選；沒給就是唯讀 */
  onSelect?: (card: Card) => void;
  /** 傳入時，該卡會加上高亮外框（例如目前選中的卡） */
  isSelected?: (card: Card) => boolean;
}

/** 卡牌總覽：依 SSR / SR / R 分成三個區塊，只顯示頭像。沒有卡的區塊不顯示。 */
export function CardOverview({ cards, isLit, onSelect, isSelected }: Props) {
  return (
    <div class="overview">
      {RARITIES.map((rarity) => {
        const list = cards.filter((c) => c.rare === rarity);
        if (list.length === 0) return null;
        const lit = list.filter(isLit).length;
        return (
          // 原生 <details>：鍵盤與讀屏都能用，預設展開
          <details key={rarity} class="ov-section" open>
            <summary class={`ov-title ov-title-${rarity}`}>
              <span class="ov-chevron" aria-hidden="true" />
              <span class="ov-rarity">{rarity}</span>
              <span class="ov-count">{lit} / {list.length}</span>
            </summary>
            <div class="grid">
              {list.map((c) => (
                <CardTile
                  key={c.name}
                  card={c}
                  lit={isLit(c)}
                  highlight={isSelected?.(c)}
                  onClick={onSelect ? () => onSelect(c) : undefined}
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
