// 從 twst.wikiru.jp 下載卡面圖示，縮成 80×80 webp，輸出到 public/icons/。
// 規則：只下載缺的；404 視為「wiki 還沒上傳」（pending，不算錯誤）；
// 回傳的不是圖片（例如 HTML 擋頁）一律不存；每次請求間隔至少 1 秒。
// 用法：npm run sync:icons [-- --limit 20]
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARDS = path.join(ROOT, 'public/data/chara.json');
const OVERRIDES = path.join(ROOT, 'public/data/image_sources.json');
const SRC_DIR = path.join(ROOT, '.cache/icon-src'); // 原圖快取（CI 用 actions/cache 保留）
const OUT_DIR = path.join(ROOT, 'public/icons');
const REPORT = path.join(ROOT, '.cache/icon-report.json');
const ORIGIN = 'https://twst.wikiru.jp/';
const SIZE = 80;
const INTERVAL_MS = 1000;
const ATTEMPTS = 3;
const MAX_BYTES = 10 * 1024 * 1024;

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sourceUrl(card, overrides) {
  const filename = overrides[card.name] ?? `${card.rare}${card.chara}【${card.costume}】アイコン.jpg`;
  if (/[\\/]|\.\./.test(filename)) throw new Error(`unsafe filename: ${filename}`);
  const ext = filename.split('.').pop();
  const hex = Buffer.from(filename, 'utf8').toString('hex').toUpperCase();
  return `${ORIGIN}attach2/696D67_${hex}.${ext}`;
}

/** 確認是真正的圖片：能解碼、格式與尺寸合理。失敗丟例外。 */
async function checkImage(buf) {
  if (!buf || buf.length === 0 || buf.length > MAX_BYTES) throw new Error('empty or oversized');
  const meta = await sharp(buf).metadata();
  if (!['jpeg', 'png', 'webp'].includes(meta.format ?? '')) throw new Error(`unsupported format ${meta.format}`);
  if (Math.min(meta.width ?? 0, meta.height ?? 0) < 16 || Math.max(meta.width ?? 0, meta.height ?? 0) > 4096) {
    throw new Error(`unexpected size ${meta.width}x${meta.height}`);
  }
  await sharp(buf).raw().toBuffer(); // 強制完整解碼，抓截斷的檔案
}

let lastRequest = 0;
/** 回傳 Buffer；404 回傳 null（pending）；其他失敗丟例外。 */
async function download(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const wait = lastRequest + INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        if (retryAfter > 30) throw new Error(`rate limited, Retry-After ${retryAfter}s`);
        lastError = new Error(`HTTP ${res.status}`);
        await sleep(Math.max(retryAfter * 1000, Math.min(2 ** attempt, 30) * 1000));
        continue;
      }
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) throw new Error(`not an image (${type})`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastError = e;
      if (String(e.message).startsWith('rate limited')) throw e;
      await sleep(Math.min(2 ** attempt, 30) * 1000);
    }
  }
  throw lastError ?? new Error('download failed');
}

async function isValidIcon(file) {
  try {
    const m = await sharp(file).metadata();
    return m.format === 'webp' && m.width === SIZE && m.height === SIZE;
  } catch {
    return false;
  }
}

async function atomicWrite(file, data) {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

const cards = JSON.parse(await readFile(CARDS, 'utf8'));
const overrides = existsSync(OVERRIDES) ? JSON.parse(await readFile(OVERRIDES, 'utf8')) : {};
await mkdir(SRC_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

const report = { valid: 0, downloaded: 0, pending: [], errors: [] };
let processed = 0;
for (const card of cards) {
  if (processed >= LIMIT) break;
  const out = path.join(OUT_DIR, `${card.name}.webp`);
  const src = path.join(SRC_DIR, `${card.name}.src`);
  try {
    if (existsSync(out) && (await isValidIcon(out))) {
      report.valid++;
      continue;
    }
    processed++;
    let raw = null;
    if (existsSync(src)) {
      raw = await readFile(src);
      try {
        await checkImage(raw);
      } catch {
        raw = null; // 快取壞了，重抓
      }
    }
    if (!raw) {
      raw = await download(sourceUrl(card, overrides));
      if (!raw) {
        report.pending.push(card.name);
        continue;
      }
      await checkImage(raw);
      await atomicWrite(src, raw);
      report.downloaded++;
    }
    const webp = await sharp(raw).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
    await atomicWrite(out, webp);
  } catch (e) {
    report.errors.push({ name: card.name, error: String(e.message ?? e) });
  }
}

await mkdir(path.dirname(REPORT), { recursive: true });
await writeFile(REPORT, JSON.stringify(report, null, 2));
const { size } = await stat(REPORT);
console.log(
  `圖示：已有 ${report.valid}、新下載 ${report.downloaded}、wiki 尚未上傳 ${report.pending.length}、錯誤 ${report.errors.length}（報告 ${size}B → .cache/icon-report.json）`,
);
// 只有真正的錯誤才讓流程失敗；wiki 尚未上傳（404）不算
if (report.errors.length > 0) {
  for (const e of report.errors.slice(0, 10)) console.error(`  ${e.name}: ${e.error}`);
  process.exit(1);
}
