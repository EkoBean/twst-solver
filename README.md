# TWST Solver

用手上的卡，算出 DUO 與 buddy 最大的隊伍。三個分頁：手牌設定、現有隊伍最優解、新卡效益計算（開發中）。

## 開發

```bash
npm install
npm run sync     # 下載卡片資料 + wiki 圖示（首次約 10 分鐘，之後只抓新卡）
npm run dev      # http://localhost:5190
npm test
npm run cli      # 不開網頁，直接用 samples/hand.json 跑求解器
```

## 資料來源

- 卡片資料：`SZ7M8ci7/simulator` 的 `chara.json`（該 repo 每 6 小時從 twst.wikiru.jp 更新）。
- 卡面圖示：直接從 twst.wikiru.jp 下載。每次請求間隔 1 秒；404（wiki 尚未上傳）不算錯誤，下次再試。
- `public/data/`、`public/icons/` 不進版控（上游沒有授權條款），由 `npm run sync` 產生。

## 部署（GitHub Pages，gh-pages 分支）

1. 在 GitHub 建立 repo，推送本專案。
2. Settings → Pages → Source 選 **Deploy from a branch**，分支選 `gh-pages`、資料夾 `/ (root)`。
3. `.github/workflows/deploy.yml` 會在 **每天 UTC 08:10 與 21:00（日本時間 17:10、06:00）**、推送到 main/master、手動觸發時，自動同步資料與圖示、建置並部署。這兩個時間是上游 `simulator` 實際更新時間（UTC 07:00–07:40、19:00–20:25）之後約 30 分鐘。
4. 手動更新並部署：`npm run deploy`（同步 → 建置 → 推到 gh-pages，不保留歷史）。

## 儲存

手牌與設定存在瀏覽器 `localStorage`（不是 cookie：cookie 上限約 4KB，手牌檔放不下）。
匯入檔的等級、突破等原始數值原樣保存；匯出時原樣寫回。只有在本站勾選的新卡，才會寫入「最高等級、突破 0」。

## 計分規則

- 隊上角色集合 S = 所有卡的角色。buddy：每張卡 3 個槽，buddy 角色在 S 內就加該槽技能分。DUO：卡的 duo 角色在 S 內加 1。
- 持有只看有沒有，不看等級與突破；buddy 技能一律取完全突破後的效果。
- 求解器不枚舉卡片組合，改枚舉角色集合，每個集合取精確最佳解（與暴力枚舉的測試結果一致）。
