# 懶人包 LazyPack — Prototype

懶人包是一個 App：上面放著一個個「懶人包」，使用者點一下，就把事情交給自己的線上 agent（Grok、ChatGPT、Claude）。agent 讀懶人包網址後自己接手：先問使用者需要的資料、到官方網站**即時**查最新的價格和規定、幫使用者比較，付款、登入、送出個資或申請之前先停下來問使用者。產品概念見 [懶人包 LazyPack 產品概念](https://claude.ai/artifact/7NHHoKN8MiSrHZ7isQ93AH)。

## 懶人包是什麼

一份懶人包就是一份給 AI 的**做事方法**，格式和 Claude 的 skill 類似：

| 段落 | 內容 |
|---|---|
| 什麼時候用 | 這份懶人包解決什麼問題、使用者會怎麼問 |
| 先問使用者 | 缺什麼資料就問，不要猜 |
| 步驟 | 每一步要到哪個來源查什麼（`[S:代號]`） |
| 怎麼比較 | 算式與比較表欄位（用變數，不放數字） |
| 要知道的事 | 不常變、但會改變答案的規則與陷阱，每條都附可以核對的來源 |
| 即時查詢來源 | 官方網址、要查什麼、打不開時搜尋什麼、上次自動檢查的結果 |
| 回報格式 | agent 回覆使用者的格式 |

**懶人包不放價格和金額。** 價格、門檻、期限會變，寫死就會過期；agent 每次都到來源現場查，並附上網址與查詢日期。`lintPack()` 會擋下寫進步驟或規則的金額。

## 來源能不能查得到

`npm run check:sources` 會用一般瀏覽器和 AI 讀取（ChatGPT-User）兩種身分打開每個來源，確認：

- 打得開（不是 403／404／擋機器人頁面）
- 不用執行 JavaScript 就讀得到預期的文字（每個來源的 `expect`）

結果寫進 `src/packs/source-status.json`，並顯示在懶人包裡（「自動檢查」）與 App 的來源清單。這個檢查需要能連外網，所以放在 GitHub Actions 跑（`.github/workflows/check-sources.yml`）：修改懶人包時自動跑，合併到預設分支後每天跑一次，結果自動 commit 回分支。

## 快速開始

```bash
npm install
npm run dev                 # 產生懶人包檔案並啟動網頁（:5173）
npm run packs               # 只重新產生 public/packs/*.md、*.json、index.json 與 public/llms.txt
npm run validate -- src/packs/content/<id>.ts   # 檢查一份懶人包並印出 AI 會讀到的內容
npm run check:sources       # 檢查所有來源網址（需要外網）
npm test
```

## 架構

```
src/packs/
  types.ts                 懶人包格式（Pack、LiveSource）與分類
  ids.ts                   所有懶人包 id（也是 App 顯示順序）
  content/<id>.ts          每份懶人包的內容
  render.ts                產生 Markdown／JSON、索引、llms.txt；lintPack()
  source-status.json       來源自動檢查結果（GitHub Actions 更新）
src/pages, src/app/        網頁：懶人包清單、交給 AI、我的交辦
public/packs/              AI 讀的懶人包檔案（npm run packs 產生，測試會確認和原始碼一致）
scripts/                   build-packs、validate-pack、check-sources
```

懶人包網址的前綴在 `src/app/config.ts`（目前指向這個分支的 GitHub raw 檔案；部署到正式網域後改成網站的 `/packs/`）。交給 agent 的「開啟」連結目前是**模擬**的，複製訊息貼給 agent 一定可行。

## 之後

- 用 Supabase 做 MCP：agent 回報進度、使用者在 App 核准。舊版 spec 的 HTTP Task API／MCP Gateway／票價計算引擎原型已移除，需要時可在 git 歷史找回（`5f55a30` 以前）。
- 用真正的 Grok、ChatGPT、Claude 實測每份懶人包，記錄哪個 agent 能讀哪些來源。
