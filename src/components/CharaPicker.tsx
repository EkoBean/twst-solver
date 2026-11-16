import { useState } from 'preact/hooks';
import { groupByDorm } from '../data';
import { Collapse } from './Collapse';
import { TargetAvatar } from './TargetAvatar';

interface Props {
  title: string;
  charas: string[];
  value: string;
  onChange: (chara: string) => void;
  /** 提供「無」選項（DUO 對象、buddy 對象可以留空） */
  noneLabel?: string;
  defaultOpen?: boolean;
}

/** 以頭像選角色：依寮分組，選完自動收闔，標題旁留下目前的選擇。 */
export function CharaPicker({ title, charas, value, onChange, noneLabel, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const pick = (c: string) => {
    onChange(c);
    setOpen(false);
  };
  return (
    <Collapse
      open={open}
      onToggle={setOpen}
      title={title}
      summary={
        value ? (
          <span class="pick-sum"><TargetAvatar chara={value} size="xs" /></span>
        ) : noneLabel ? (
          <span class="pick-cap-inline">{noneLabel}</span>
        ) : undefined
      }
    >
      {noneLabel && (
        <button type="button" class={`chip none-chip${value === '' ? ' on' : ''}`} onClick={() => pick('')}>
          {noneLabel}
        </button>
      )}
      {groupByDorm(charas).map((g) => (
        <div class="dorm-group" key={g.dorm}>
          <h4 class="dorm-title">{g.dorm}</h4>
          <div class="pick-grid">
            {g.charas.map((c) => (
              <button key={c} type="button" class={`pick-btn${c === value ? ' on' : ''}`} onClick={() => pick(c)}>
                <TargetAvatar chara={c} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </Collapse>
  );
}
