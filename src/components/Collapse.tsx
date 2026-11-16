import type { ComponentChildren } from 'preact';

interface Props {
  open: boolean;
  onToggle: (open: boolean) => void;
  /** 標題（例如「角色」） */
  title: string;
  /** 收闔時顯示在標題旁的內容（目前的選擇） */
  summary?: ComponentChildren;
  children: ComponentChildren;
}

/** 可收闔的區塊，開關狀態由外面控制（選完角色後由外面把它收起來）。 */
export function Collapse({ open, onToggle, title, summary, children }: Props) {
  return (
    <section class={`collapse${open ? ' open' : ''}`}>
      <button type="button" class="collapse-head" aria-expanded={open} onClick={() => onToggle(!open)}>
        <span class="collapse-title">{title}</span>
        <span class="collapse-summary">{summary}</span>
        <span class="collapse-chev" aria-hidden="true" />
      </button>
      {open && <div class="collapse-body">{children}</div>}
    </section>
  );
}
