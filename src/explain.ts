import { prepareCard } from './solver';
import type { Card, Weights } from './types';

export interface SlotLink {
  /** 對象角色名 */
  chara: string;
  /** 該槽的技能原文（完全突破後） */
  skill: string;
  /** 該槽成立時貢獻的分數 */
  score: number;
  /** 對象在隊上、且該槽有技能分數 */
  matched: boolean;
}

/** 一張卡的 DUO 與 buddy 對象，以及各自是否成立。 */
export interface CardLinks {
  card: Card;
  duo: { chara: string; matched: boolean } | null;
  buddy: SlotLink[];
}

/**
 * 以「一張卡」為單位，列出它的 DUO 對象與 3 個 buddy 對象，並標示在 team 裡是否成立。
 * 判定與 scoreTeam 相同：對象角色在隊上才成立；沒有技能分數的槽不算成立。
 * team 為 null 表示沒有隊伍脈絡（例如手牌總覽），此時一律視為成立，只用來顯示對象是誰。
 */
export function cardLinks(card: Card, team: Card[] | null, weights: Weights): CardLinks {
  const chars = team ? new Set(team.map((c) => c.chara)) : null;
  const slots = prepareCard(card, true, weights).slots;
  const skills = [card.buddy1s_totsu, card.buddy2s_totsu, card.buddy3s_totsu];
  const buddy: SlotLink[] = [];
  slots.forEach((slot, i) => {
    if (!slot.char) return; // 沒有這個槽
    buddy.push({
      chara: slot.char,
      skill: skills[i] ?? '',
      score: slot.w,
      matched: chars ? chars.has(slot.char) && slot.w > 0 : true,
    });
  });
  return {
    card,
    duo: card.duo ? { chara: card.duo, matched: chars ? chars.has(card.duo) : true } : null,
    buddy,
  };
}

/** 顯示用：一張卡下方的一個「對象」頭像。 */
export interface TargetInfo {
  chara: string;
  /** 亮起：這個對象的 buddy 或 DUO 成立 */
  lit: boolean;
  /** 這個對象同時是 DUO 對象 → 右上角掛 DUO 小旗幟 */
  isDuo: boolean;
  /** 該槽 buddy 成立時的分數與技能（不成立或只是 DUO 時為 0 / 空字串） */
  score: number;
  skill: string;
}

/**
 * 把一張卡的 buddy 對象排成顯示順序（最多 3 個，左到右）。
 * DUO 對象通常就是其中一個 buddy，直接在它身上標旗幟；
 * 少數卡的 DUO 對象不在 buddy 裡，就多放一個只有 DUO 旗幟的頭像在最後。
 */
export function targetsOf(links: CardLinks): TargetInfo[] {
  const duo = links.duo;
  const out: TargetInfo[] = links.buddy.map((b) => {
    const isDuo = duo?.chara === b.chara;
    return {
      chara: b.chara,
      lit: b.matched || (isDuo && duo.matched),
      isDuo,
      score: b.matched ? b.score : 0,
      skill: b.matched ? b.skill : '',
    };
  });
  if (duo && !out.some((t) => t.isDuo)) {
    out.push({ chara: duo.chara, lit: duo.matched, isDuo: true, score: 0, skill: '' });
  }
  return out;
}

/** 整支隊伍，每張卡一筆（順序與 team 相同）。 */
export function explainTeam(team: Card[], weights: Weights): CardLinks[] {
  return team.map((c) => cardLinks(c, team, weights));
}

/** 成立的 DUO 數與 buddy 分數總和；必須等於求解器算出的隊伍分數。 */
export function totalsOf(links: CardLinks[]): { duo: number; buddy: number } {
  let duo = 0;
  let buddy = 0;
  for (const l of links) {
    if (l.duo?.matched) duo += 1;
    for (const b of l.buddy) if (b.matched) buddy += b.score;
  }
  return { duo, buddy };
}
