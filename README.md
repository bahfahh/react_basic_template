# 懶人包 LazyPack — Prototype

懶人包是一個 App：上面放著一個個「懶人包」（省錢任務包），使用者點一下，就把任務交給自己的線上 agent（Grok Bot、ChatGPT Dot、Claude Duet），agent 讀懶人包網址後自己接手做完；付款、登入、送出個資前會先問使用者。產品概念見 [懶人包 LazyPack 產品概念](https://claude.ai/artifact/7NHHoKN8MiSrHZ7isQ93AH)。

目前狀態：
- **介面**：懶人包清單 → 懶人包頁「交給 AI」→ 我的交辦（存在瀏覽器）。開啟 agent 的連結是**模擬**的（未實測），複製訊息貼給 agent 一定可行。
- **懶人包網址**：每個可用的懶人包都有一份 AI 讀得懂的說明（`public/packs/<id>.md`）與資料（`.json`），由 `npm run packs` 從比較引擎與票價資料產生。repo 是公開的，所以 GitHub raw 網址現在就能給 AI 讀。
- **之後**：MCP Gateway 改放 Supabase，接上後 agent 可以回報進度、使用者在 App 核准。現有的 `server/`（HTTP Task API + MCP Gateway）與 `src/core/`（比較引擎、任務狀態機、核准）保留作為後端基礎。

> ⚠️ 票價是 2026-10-31 從搜尋結果摘錄整理的，每個來源都標示可信度，真實使用前必須人工抽查，清單見 [`docs/data-verification.md`](docs/data-verification.md)。

## 快速開始

```bash
npm install
npm run dev          # 產生懶人包檔案並啟動網頁（:5173）
npm run packs        # 只重新產生 public/packs/*.md、*.json 與 public/llms.txt
npm test             # 比較引擎、任務／核准、Web API ↔ MCP 一致性、懶人包檔案同步
npm run dev:api      # （後端原型）HTTP Task API + MCP Gateway（:8787）
```

## 懶人包網址

| 檔案 | 用途 |
|---|---|
| `public/packs/travel.jp-ticket-optimizer.md` | 給 AI 讀的任務說明：要問什麼、步驟、規則、票價表、來源、範例、回報格式 |
| `public/packs/travel.jp-ticket-optimizer.json` | 同樣的資料，給程式解析 |
| `public/packs/index.json`、`public/llms.txt` | 所有懶人包的索引 |

網址的前綴在 `src/app/config.ts`（目前指向這個分支的 GitHub raw 檔案；部署到正式網域後改成網站的 `/packs/`）。

## 架構

```
src/core/                 ← 唯一事實來源（瀏覽器與 Node 共用，無 DOM／Node 依賴）
  catalog/data.ts         票券、景點、票價與 PolicySource（含核對日、可信度）
  optimizer/              正規化需求 → 動態規劃找最低總價 → 三種策略、警告、來源新鮮度
  packages/               Task Package Registry、zod 輸入／輸出 schema、SKILL.md 產生器
  tasks/service.ts        TaskService：狀態機、權限、核准（actionId + payloadHash + expiry）、MockExecutor、事件、成本帳
  scenarios.ts            14 組人工建立的行程（P0 驗收 §11.6 #1）
server/
  app.ts                  HTTP Task API（spec §6.3 路由、Idempotency-Key、速率限制）
  mcp.ts                  MCP Gateway（Streamable HTTP，9 個工具）
src/pages, src/app/      網頁：懶人包清單、交給 AI、我的交辦
public/packs/             AI 讀的懶人包檔案（npm run packs 產生）
registry/<package-id>/    匯出的 manifest.yaml、JSON Schema、SKILL.md（npm run export:schemas）
tests/                    vitest
```

HTTP API 與 MCP Gateway 都呼叫同一個 `TaskService`，所以驗證、跨租戶檢查、核准規則不會因管道不同而漂移（`tests/gateway-parity.test.ts`）。

後端原型的示範 token（`lp_demo_user_alice` 本人可核准、`lp_demo_agent_alice` agent 不可核准、`lp_demo_user_bob`、`lp_demo_admin`）定義在 `src/core/auth.ts`；正式版改用 OAuth。

更多：[spec 對照與取捨](docs/prototype-notes.md)・[相容性實測清單](docs/compatibility-test-checklist.md)・[使用者測試腳本](docs/user-test-script.md)・[資料核對清單](docs/data-verification.md)
