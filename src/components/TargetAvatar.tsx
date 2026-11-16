import { repCard } from '../data';
import type { Card } from '../types';
import { CardIcon, type IconSize } from './CardIcon';

interface Props {
  /** DUO / buddy 對象的角色名 */
  chara: string;
  /** 亮起 = 這個對象成立（在隊上）；變暗 = 不成立 */
  lit?: boolean;
  /** 已知的卡（例如隊上同角色的那張）。沒給就用該角色的代表卡 */
  card?: Card;
  size?: Exclude<IconSize, 'md' | 'lg'>;
  /** 頭像下方第二行小字（例如分數） */
  sub?: string;
  /** 滑過時的提示文字（例如技能全名） */
  hint?: string;
  /** 右上角的小旗幟文字（DUO 對象才會有） */
  flag?: string;
}

/** 「對象」的小頭像：上面頭像，下面角色名（caption）。tooltip 與隊伍明細共用。 */
export function TargetAvatar({ chara, lit = true, card, size = 'sm', sub, hint, flag }: Props) {
  const c = card ?? repCard(chara);
  return (
    <span class={`target target-${size}${lit ? '' : ' off'}`} title={hint ? `${chara}　${hint}` : chara}>
      <span class={`tile-host host-${size}`}>
        {c ? (
          <CardIcon card={c} lit={lit} size={size} hideElements />
        ) : (
          // 資料庫裡沒有這個角色的任何卡
          <span class={`tile tile-${size} ${lit ? 'lit' : 'dim'}`}>
            <span class="noimg" aria-hidden="true">{chara.slice(0, 2)}</span>
          </span>
        )}
        {flag && <span class={`target-flag${lit ? '' : ' off'}`}>{flag}</span>}
      </span>
      <span class="target-name">{chara}</span>
      {sub && <span class="target-sub">{sub}</span>}
    </span>
  );
}
