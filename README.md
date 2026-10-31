# 懶人包 LazyPack — Prototype

依 `LazyPack Product & Prototype Specification v1.1` 第 11 節（2026-10-31 方向更新）製作的原型：
**日本票券省錢助手（大阪・京都）**。輸入日期、人數與景點，比較「逐項單買／Pass 優先／最佳混合」三種策略，
每一筆價格附來源與核對日期，選好方案後產生購買清單，並在你逐項核准後模擬預填官方購買頁——**一定停在登入、OTP、CAPTCHA、付款之前**。

> ⚠️ 示範資料：票價與涵蓋範圍是 2026-10-31 從搜尋結果摘錄整理的（建置環境無法直接開啟官方網站），
> 每個來源都標示 `verification: search_extract` 與可信度。真實使用者測試前必須人工抽查，清單見 [`docs/data-verification.md`](docs/data-verification.md)。

## 快速開始

```bash
npm install
npm run dev          # API + MCP Gateway (:8787) 與網頁 (:5173) 一起啟動
npm test             # 49 個測試：比較引擎、狀態機／核准、Web API ↔ MCP 一致性
npm run mcp:smoke    # 用 MCP SDK client 走一次 create → select → (agent 不能核准) 流程
npm run build:demo   # 純前端示範版（瀏覽器內跑同一套核心，資料存 localStorage）
```

打開 http://localhost:5173 →「免費比較我的行程」→ 展開「示範情境與重播設定」可載入 14 組測試行程，或勾選 CAPTCHA／售完／漲價來重播失敗路徑。

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
src/pages, components/    網頁（手機優先、繁體中文）
registry/<package-id>/    匯出的 manifest.yaml、JSON Schema、SKILL.md（npm run export:schemas）
tests/                    vitest
```

網頁、HTTP API、MCP 三個入口都呼叫同一個 `TaskService`，所以驗證、跨租戶檢查、核准規則不會因管道不同而漂移（`tests/gateway-parity.test.ts`）。

### 示範 token（原型）

| token | 身分 | 權限 |
|---|---|---|
| `lp_demo_user_alice` | Alice 本人（網頁） | 讀寫任務、**可核准** |
| `lp_demo_agent_alice` | Alice 的外部 Agent（MCP） | 讀寫任務、**不可核准** → 拿到網頁核准連結 |
| `lp_demo_user_bob` | Bob | 看不到 Alice 的任務（回 404） |
| `lp_demo_admin` | 內部覆核 | 全部任務、來源重新核對 |

正式版改用 OAuth/OIDC、最小權限 scope、短效 token（spec §6.1）。

## 頁面

| 路徑 | 對應 spec §4.3 |
|---|---|
| `/` | Landing／Theme：案例卡由引擎即時計算、不保證結果聲明 |
| `/start` | Intake：一句話解析（規則式，正式版換 LLM）＋動態表單＋缺漏資訊 |
| `/tasks/:id` 比較結果 | Eligibility & Value：三策略、明細、同等權益檢查、限制、非等價選項、另需支付 |
| `/tasks/:id` 購買準備 | Plan & Quote＋核准：購買清單、誰做什麼、費用報價、核准卡、執行紀錄 |
| `/tasks/:id` 結果 | Outcome：預估節省 vs 已驗證節省分開；無收據只算「已送出」 |
| `/tasks/:id` 時間軸／來源與方法 | 事件、計算方法、來源新鮮度、重算比對雜湊 |
| `/marketplace` | Marketplace：Package 規格、L0–L4 實測相容性、SKILL.md 下載 |
| `/developers` | HTTP API／MCP 說明 |
| `/admin` | Admin：案件、政策來源重新核對、失敗原因、漏斗、成本、稽核 |

更多：[spec 對照與取捨](docs/prototype-notes.md)・[相容性實測清單](docs/compatibility-test-checklist.md)・[使用者測試腳本](docs/user-test-script.md)・[資料核對清單](docs/data-verification.md)
