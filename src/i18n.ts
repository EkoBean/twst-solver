import { createStore, useStore } from './store';

export type Lang = 'ja' | 'zh';

// 卡片名稱、角色名、服裝名維持日文原文，不放進這裡。
const zh = {
  'app.title': 'TWST 隊伍求解器',
  'app.subtitle': '用手上的卡，算出 DUO 與 buddy 最大的隊伍',
  'lang.label': '語言',
  'tab.hand': '手牌設定',
  'tab.solver': '現有隊伍最優解',
  'tab.newcard': '新卡效益計算',

  'hand.guide.title': '先取得你的手牌檔',
  'hand.guide.step1': '打開手牌管理網站，勾選你持有的卡片。',
  'hand.guide.step2': '在網站上按「匯出」，下載 JSON 檔。',
  'hand.guide.step3': '回到這裡，把 JSON 檔丟進下面的區域。',
  'hand.guide.link': '開啟手牌管理網站 ↗',
  'hand.guide.note': '本站只看「有沒有持有」，不看等級與突破。檔案裡的原始數值會完整保存。',
  'hand.import.drop': '把手牌 JSON 拖到這裡，或點擊選擇檔案',
  'hand.import.ok': '已匯入 {count} 張持有卡片',
  'hand.import.unknown': '其中 {count} 張在資料庫找不到（可能是新卡，資料庫尚未更新），仍會保留。',
  'hand.import.fail': '無法讀取這個檔案：{reason}',
  'hand.import.multiSet': '檔案內有多組手牌，只匯入「使用中」的那一組。',
  'hand.export': '匯出 JSON',
  'hand.reset': '清空手牌',
  'hand.reset.confirm': '確定要清空所有手牌資料嗎？這個動作無法復原。',
  'hand.stats': '持有 {owned} / {total}',
  'hand.filter.onlyOwned': '只看持有',
  'hand.filter.element': '魔法屬性',
  'hand.filter.all': '全部',
  'hand.hint.edit': '點一下卡片可切換持有。亮起＝持有，變暗＝未持有。',
  'hand.hint.readonly': '目前只顯示持有的卡片。取消「只看持有」才能新增或移除。',
  'hand.empty': '還沒有任何手牌。請匯入 JSON，或取消「只看持有」手動點選。',
  'hand.exportNote': '從本站勾選的卡片會以「最高等級、0 突破」寫入匯出檔。',

  'solver.mode': '模式',
  'solver.mode.4': '4 張',
  'solver.mode.5': '5 張',
  'solver.mode.4+1': '4+1',
  'solver.mode.hint.4': '只用手牌，找 4 張的最佳隊伍。',
  'solver.mode.hint.5': '只用手牌，找 5 張的最佳隊伍。',
  'solver.mode.hint.4+1': '4 張用手牌，第 5 張是朋友的 support，從全卡池推薦。',
  'solver.element': '魔法屬性',
  'solver.element.any': '不限',
  'solver.rank': '排序優先',
  'solver.rank.duo': 'DUO 優先',
  'solver.rank.buddy': 'buddy 優先',
  'solver.stat': '能力優先',
  'solver.weights': '權重設定',
  'solver.weights.mul': '優先項倍率',
  'solver.weights.small': '小',
  'solver.weights.mid': '中',
  'solver.weights.big': '大',
  'solver.weights.critS': 'クリティカル(小)',
  'solver.weights.critM': 'クリティカル(中)',
  'solver.weights.mutual': '相互 DUO 加分（每對）',
  'solver.run': '計算',
  'solver.running': '計算中…',
  'solver.noHand': '還沒有手牌，先到「手牌設定」匯入。',
  'solver.goHand': '前往手牌設定',
  'solver.notEnough': '符合條件的手牌只有 {count} 張，不足 {need} 張。',
  'solver.pool': '符合條件的手牌 {count} 張',
  'solver.time': '計算時間 {ms} ms',
  'solver.support': 'SUPPORT',
  'solver.score.duo': 'DUO',
  'solver.score.buddy': 'buddy',
  'solver.assume': '計算時，buddy 技能一律以完全突破後的效果計算；support 同樣視為完全突破。',
  'solver.result.title': '推薦結果',

  'tip.targets': 'buddy 對象（旗幟＝DUO）',
  'tip.duoFlag': 'D',
  'tip.none': '無',
  'team.mutual': '相互 DUO：{pairs}（每對 +{n}）',
  'team.detail.toggle': '詳細',
  'team.detail': '每張卡下方是它的 buddy 對象：亮起＝在隊上，旗幟＝DUO 對象，+數字＝該槽分數（滑過看技能）。',


  'new.title': '新卡效益計算',
  'new.desc': '選一張卡，或自己輸入角色、DUO 對象、buddy 對象，算出以這張卡為中心能組出的最佳隊伍。',
  'new.settings.title': '計算條件（和「現有隊伍最優解」分開設定）',
  'new.source.pick': '從卡池選擇',
  'new.source.manual': '手動輸入',
  'new.pick.chara': '角色',
  'new.pick.card': '卡片',
  'new.pick.owned': '這張卡已在手牌。效益＝「沒有它」與「有它」的差距。',
  'new.manual.hint': '資料庫還沒收錄的新卡，自己填它的角色與對象。',
  'new.field.chara': '這張卡的角色',
  'new.field.element': '魔法屬性',
  'new.field.duo': 'DUO 對象',
  'new.field.none': '（無）',
  'new.field.buddy': 'buddy 對象 {n}',
  'new.field.hp': 'HP',
  'new.field.atk': 'ATK',
  'new.field.crit': 'クリティカル',
  'new.field.skip': '—',
  'new.run': '計算效益',
  'new.badge': 'NEW',
  'new.teams.none': '手牌不足，湊不出包含這張卡的隊伍。',
  'new.before': '沒有這張卡時的最佳',
  'new.after': '以這張卡為中心的最佳隊伍',
  'new.gain': '比沒有這張卡多',
  'new.gain.none': '這張卡放進隊伍，分數沒有比現有最佳隊伍高，對你目前的手牌沒有幫助。',
  'new.filtered': '這張卡不符合上面選的魔法屬性（{el}），請把魔法屬性改成「不限」。',
  'new.noBase': '手牌不足，沒有這張卡就湊不出隊伍，無法比較。',
  'new.pick.empty': '請先選一張卡。',

  'footer.data': '卡片資料與圖示來源：Twisted-Wonderland Wiki（twst.wikiru.jp）',
  'footer.sync': '資料更新：{date}',
  'footer.fan': '這是粉絲製作的非官方工具。角色與圖像的權利屬於各權利人。',
  'load.fail': '找不到卡片資料。請先執行 npm run sync。',
} as const;

export type MsgKey = keyof typeof zh;

const ja: Record<MsgKey, string> = {
  'app.title': 'TWST チーム最適化ツール',
  'app.subtitle': '手持ちカードから、DUO と バディ が最大になる編成を計算します',
  'lang.label': '言語',
  'tab.hand': '手持ち設定',
  'tab.solver': '手持ちの最適編成',
  'tab.newcard': '新カード効果計算',

  'hand.guide.title': 'まず手持ちデータを用意する',
  'hand.guide.step1': '手持ち管理サイトを開き、所持しているカードを選びます。',
  'hand.guide.step2': 'サイトで「エクスポート」を押し、JSON ファイルを保存します。',
  'hand.guide.step3': 'ここに戻り、下のエリアに JSON ファイルを入れます。',
  'hand.guide.link': '手持ち管理サイトを開く ↗',
  'hand.guide.note': '本サイトは「所持しているか」だけを見ます。レベルや凸は計算に使いません。ファイル内の元の数値はそのまま保存されます。',
  'hand.import.drop': '手持ち JSON をここにドラッグ、またはクリックして選択',
  'hand.import.ok': '所持カード {count} 枚を読み込みました',
  'hand.import.unknown': 'うち {count} 枚はデータベースに見つかりません（新カードで未反映の可能性）。データは保持されます。',
  'hand.import.fail': 'ファイルを読み込めません：{reason}',
  'hand.import.multiSet': '複数セットが含まれています。「使用中」のセットのみ読み込みます。',
  'hand.export': 'JSON を書き出す',
  'hand.reset': '手持ちを消去',
  'hand.reset.confirm': '手持ちデータをすべて消去しますか？この操作は元に戻せません。',
  'hand.stats': '所持 {owned} / {total}',
  'hand.filter.onlyOwned': '所持のみ表示',
  'hand.filter.element': '魔法属性',
  'hand.filter.all': 'すべて',
  'hand.hint.edit': 'カードをタップすると所持を切り替えられます。点灯＝所持、暗い＝未所持。',
  'hand.hint.readonly': '現在は所持カードのみ表示しています。追加・削除するには「所持のみ表示」を外してください。',
  'hand.empty': '手持ちがありません。JSON を読み込むか、「所持のみ表示」を外して選んでください。',
  'hand.exportNote': '本サイトで選んだカードは「最大レベル・凸 0」で書き出されます。',

  'solver.mode': 'モード',
  'solver.mode.4': '4 枚',
  'solver.mode.5': '5 枚',
  'solver.mode.4+1': '4+1',
  'solver.mode.hint.4': '手持ちのみで 4 枚の最適編成を探します。',
  'solver.mode.hint.5': '手持ちのみで 5 枚の最適編成を探します。',
  'solver.mode.hint.4+1': '4 枚は手持ち、5 枚目はフレンドのサポート。全カードから推薦します。',
  'solver.element': '魔法属性',
  'solver.element.any': '指定なし',
  'solver.rank': '優先順位',
  'solver.rank.duo': 'DUO 優先',
  'solver.rank.buddy': 'バディ優先',
  'solver.stat': '重視する能力',
  'solver.weights': '重みの設定',
  'solver.weights.mul': '優先項目の倍率',
  'solver.weights.small': '小',
  'solver.weights.mid': '中',
  'solver.weights.big': '大',
  'solver.weights.critS': 'クリティカル(小)',
  'solver.weights.critM': 'クリティカル(中)',
  'solver.weights.mutual': '相互 DUO ボーナス（1組）',
  'solver.run': '計算する',
  'solver.running': '計算中…',
  'solver.noHand': '手持ちがありません。先に「手持ち設定」で読み込んでください。',
  'solver.goHand': '手持ち設定へ',
  'solver.notEnough': '条件に合う手持ちが {count} 枚しかなく、{need} 枚に足りません。',
  'solver.pool': '条件に合う手持ち {count} 枚',
  'solver.time': '計算時間 {ms} ms',
  'solver.support': 'サポート',
  'solver.score.duo': 'DUO',
  'solver.score.buddy': 'バディ',
  'solver.assume': '計算では、バディスキルはすべて完凸後の効果で扱います。サポートも完凸として扱います。',
  'solver.result.title': '推薦結果',

  'tip.targets': 'バディ相手（旗＝DUO）',
  'tip.duoFlag': 'D',
  'tip.none': 'なし',
  'team.mutual': '相互 DUO：{pairs}（1組 +{n}）',
  'team.detail.toggle': '詳細',
  'team.detail': '各カードの下はバディ相手です。点灯＝編成内、旗＝DUO 相手、+数字＝そのスロットの点数（ホバーでスキル表示）。',


  'new.title': '新カード効果計算',
  'new.desc': 'カードを選ぶか、キャラ・DUO 相手・バディ相手を入力して、そのカードを中心に組める最適編成を計算します。',
  'new.settings.title': '計算条件（「手持ちの最適編成」とは別設定）',
  'new.source.pick': 'カードプールから選ぶ',
  'new.source.manual': '手動入力',
  'new.pick.chara': 'キャラ',
  'new.pick.card': 'カード',
  'new.pick.owned': 'このカードは手持ちにあります。効果は「無い場合」と「ある場合」の差です。',
  'new.manual.hint': 'データベース未収録の新カードのキャラと相手を入力します。',
  'new.field.chara': 'このカードのキャラ',
  'new.field.element': '魔法属性',
  'new.field.duo': 'DUO 相手',
  'new.field.none': '（なし）',
  'new.field.buddy': 'バディ相手 {n}',
  'new.field.hp': 'HP',
  'new.field.atk': 'ATK',
  'new.field.crit': 'クリティカル',
  'new.field.skip': '—',
  'new.run': '効果を計算',
  'new.badge': 'NEW',
  'new.teams.none': '手持ちが足りず、このカードを含む編成を作れません。',
  'new.before': 'このカードが無い場合の最適編成',
  'new.after': 'このカードを中心にした最適編成',
  'new.gain': 'このカードがある場合の上昇',
  'new.gain.none': 'このカードを入れても、現在の最適編成より点数が上がりません。',
  'new.filtered': 'このカードは上で選んだ魔法属性（{el}）に合いません。「指定なし」にしてください。',
  'new.noBase': '手持ちが足りず、このカード無しでは編成できないため比較できません。',
  'new.pick.empty': 'カードを選んでください。',

  'footer.data': 'カードデータと画像の出典：ツイステッドワンダーランド攻略 Wiki（twst.wikiru.jp）',
  'footer.sync': 'データ更新：{date}',
  'footer.fan': 'ファンメイドの非公式ツールです。キャラクターと画像の権利は各権利者に帰属します。',
  'load.fail': 'カードデータが見つかりません。先に npm run sync を実行してください。',
};

const dicts: Record<Lang, Record<MsgKey, string>> = { zh, ja };

function detect(): Lang {
  try {
    return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'zh';
  } catch {
    return 'zh';
  }
}

export const langStore = createStore<Lang>('twst-solver/lang/v1', detect(), (v) =>
  v === 'ja' || v === 'zh' ? v : null,
);

export function translate(lang: Lang, key: MsgKey, params?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** 元件內使用：語言改變時自動重繪。 */
export function useT() {
  const lang = useStore(langStore);
  return {
    lang,
    t: (key: MsgKey, params?: Record<string, string | number>) => translate(lang, key, params),
  };
}
