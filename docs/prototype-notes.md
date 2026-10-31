# Spec 對照與原型取捨

> 2026-10-31 更新：前端已改成「懶人包清單＋交給 AI」，原本的比較／核准／管理頁面已移除（見 git 歷史 `94cf4b8`）。下表的對照仍適用於 `src/core` 與 `server/` 的後端原型與 MCP Gateway。

## P0 驗收條件（§8、§11.6）

| # | 條件 | 原型做法 | 驗證 |
|---|---|---|---|
| §8-1 | 3 分鐘內建立示範案件並看到下一步 | `/start` 載入情境或一句話解析 → 建立任務 → 任務頁頂端「下一步」提示 | 手動走查（Playwright 截圖） |
| §8-2 | 待補件／待核准／處理中／已送出／已解決 | `statusBucket()` 五段進度條＋細分狀態 | `tests/task-service.test.ts` |
| §8-3 | 未核准絕不執行；改 payload 後核准失效 | 核准綁定 `actionId + payloadHash + expiresAt`；service 與 executor 各自驗證 | `approvals` 測試組 |
| §8-4 | 已送出 ≠ 已追回 | `submitted` 的 `verifiedSavings = null`、不計入 admin 已驗證節省 | `outcomes` 測試 |
| §8-5 | 主張附來源、範圍、核對日；不確定時不判斷 | 每行 `sourceIds`；未知價格／未確認涵蓋不計入；過期來源 `block` | `optimizer.test.ts` |
| §8-6 | Mock 情境可重播（含失敗／補件） | 14 組情境＋CAPTCHA／售完／漲價重播開關 | 兩個測試檔 |
| §8-7 | 同一 Package 經 Web API 與 MCP 建任務、權限一致 | 同一 `TaskService`；跨租戶在兩管道都回 not_found | `gateway-parity.test.ts` |
| §8-8 | 不記錄密碼、OTP、證件全文 | `redact()` 在寫入事件前遮蔽；輸入 schema `.strict()` 拒絕未知欄位 | `P0 #8` 測試 |
| §11.6-1 | ≥10 組行程（划算／不划算／不涵蓋／日期限制／人數／售罄／過期） | `src/core/scenarios.ts` 14 組 | `optimizer.test.ts` |
| §11.6-2 | 可重現、不憑空生成價格 | 確定性 DP；`resultHash` 重算比對；動態／未知價格另列 | 同上 |
| §11.6-3 | 推薦可看來源、計算、限制、查詢時間 | 「來源與方法」分頁 | 手動 |
| §11.6-4 | 輸入 → 搜尋 → 比較 → 核對 → 購買準備（不付款） | 完整流程，MockExecutor 停在付款前 | 手動＋測試 |
| §11.6-5 | 登入／OTP／CAPTCHA／付款安全暫停 | executor 遇到即 `paused_for_user` 交還 | CAPTCHA 測試 |
| §11.6-6 | 網站與 MCP 跑通同一案例；其他平台列矩陣 | MCP 建立 → 網頁核准 → MCP 讀結果；L0–L4 矩陣 | parity 測試、Marketplace 頁 |

## 與 spec 建議 stack 的差異（刻意的原型取捨）

| spec §6.1 | 原型 | 原因 |
|---|---|---|
| Next.js | Vite + React + TypeScript + Tailwind | 沿用現有 template；核心邏輯與框架無關，可直接搬到 Next.js |
| ASP.NET Core Web API | Node（`node:http`）+ TypeScript | 前後端共用同一份計算引擎與 schema，原型期避免兩套實作漂移；正式版仍可依團隊選擇改寫，`tests/` 可作規格 |
| PostgreSQL | 記憶體 + `.data/store.json`（伺服器）／localStorage（示範版） | 原型不需要多實例；資料模型（Task、TaskEvent、ActionProposal、Approval、Outcome、CostEntry、PolicySource）已對齊 §6.4 |
| LLM provider adapter | 規則式 intake 解析 | 原型不呼叫外部模型；成本帳以模擬值記錄 LLM 用量 |
| Computer Use | `MockExecutor`（不連線） | 依 spec「MockExecutor 優先」；網域白名單、冪等、金額核對、安全暫停都已實作 |

## 計算模型

- 需求：每天的城市、景點；交通段數依景點自動估算（同區景點視為步行），使用者可改。
- 價格：`PriceRule` 依平日／假日；兒童 6–11、幼兒 0–5、12 歲以上算大人。
- 最佳化：每個旅客類別各自做動態規劃，狀態＝仍有效的多日券與已用過的設施；平手選購買項目較少者。
- 同等權益：所有策略涵蓋同樣的需求，差別只在支付方式；條件不同的較便宜選項（例如改白天入場）另列「非等價選項」。
- 保守原則：價格未知 → 不計入且警告；涵蓋未確認（`confirmed: false`）→ 不算 Pass 的功勞；來源過期或需覆核 → 推薦方案用到就阻擋購買協助。

## 待決問題（延續 spec §10，原型未假裝已確認）

1. 使用者願付費的是「比較＋清單」還是「代為預填／多站點追蹤」？（原型以 NT$149 假門測付費意向）
2. 官方數位票（スルッとQRtto 等）是否允許自動預填？需逐站確認使用條款後才可能接真實 Computer Use。
3. 票價資料的維護成本：每年度版（FY）更新、設施清單變動、京都非居民票價（預計 2027 年度）都需要人工流程。
4. 各 Agent 平台的實際 MCP 支援需逐產品實測，見相容性清單。
