// 從 SZ7M8ci7/simulator 下載卡片資料，驗證欄位後寫入 public/data/。
// 用法：npm run sync
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'https://raw.githubusercontent.com/SZ7M8ci7/simulator/master';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data');
const MIN_CARDS = 400; // 少於這個數量就當作壞資料，不覆蓋舊檔

const REQUIRED = [
  'name', 'chara', 'rare', 'attr', 'duo',
  'buddy1c', 'buddy2c', 'buddy3c',
  'buddy1s', 'buddy2s', 'buddy3s',
  'buddy1s_totsu', 'buddy2s_totsu', 'buddy3s_totsu',
  'magic1atr', 'magic2atr', 'magic3atr',
];

async function getJson(file) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

const cards = await getJson('chara.json');
if (!Array.isArray(cards) || cards.length < MIN_CARDS) {
  throw new Error(`chara.json 卡片數異常：${Array.isArray(cards) ? cards.length : typeof cards}`);
}
const missing = new Set();
for (const card of cards) for (const key of REQUIRED) if (!(key in card)) missing.add(key);
if (missing.size > 0) throw new Error(`chara.json 缺少欄位：${[...missing].join(', ')}`);

const names = new Set(cards.map((c) => c.name));
if (names.size !== cards.length) throw new Error('chara.json 的 name 有重複');

const info = await getJson('characters_info.json');
// 檔名特例（上游已審核的 wiki 附件檔名）；取不到不影響主流程
let imageSources = {};
try {
  imageSources = await getJson('image_sources.json');
} catch (e) {
  console.warn(`image_sources.json 略過：${e.message}`);
}

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'chara.json'), JSON.stringify(cards));
await writeFile(path.join(OUT, 'characters_info.json'), JSON.stringify(info));
await writeFile(path.join(OUT, 'image_sources.json'), JSON.stringify(imageSources));
await writeFile(
  path.join(OUT, 'meta.json'),
  JSON.stringify({ syncedAt: new Date().toISOString(), cardCount: cards.length }),
);
console.log(`OK: ${cards.length} 張卡 → ${OUT}`);
