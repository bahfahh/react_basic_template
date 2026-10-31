# 跨 Agent 相容性實測清單（spec §5.2）

產品頁只顯示**實測**等級。每次測試記錄：平台、產品名稱與版本、測試帳號類型、日期、截圖／log、結果等級。

| 等級 | 通過條件 |
|---|---|
| L1 exportable | `registry/travel.jp-ticket-optimizer/SKILL.md` 能被平台讀取（貼上或上傳不報錯） |
| L2 installable | 能依平台**官方文件**的方式安裝（connector／plugin／skill），不用繞路 |
| L3 callable | 測試帳號中，平台 Agent 成功呼叫 `search_packages` 與 `get_package` |
| L4 end_to_end | 完成：`create_task` → `get_task`（plan_ready）→ `submit_task_input(select_strategy)` → 使用者在網頁核准 → Agent 以 `get_task` 回報 `awaiting_external_response` |

## 每個平台的步驟

1. 部署 API 到可公開存取的 HTTPS 網址（MCP endpoint：`/mcp`）。
2. 依平台文件新增遠端 MCP server，token 放在平台的密鑰設定，**不寫進 SKILL.md**。
3. 讓 Agent 執行：「幫我比較 11/24 兩個大人在大阪去大阪城、梅田藍天大廈、道頓堀遊船，周遊卡划不划算」。
4. 檢查 Agent 是否：問缺漏資料而非猜測、說明預估節省是估算、附來源核對日、把核准連結交給使用者。
5. 嘗試讓 Agent 直接 `approve_action` → 應得到 `approval_required_in_app`。
6. 記錄結果並更新 `src/core/packages/registry.ts` 的 `compatibility`，再 `npm run export:schemas`。

## 目前狀態（2026-10-31）

| 環境 | 等級 | 證據 |
|---|---|---|
| LazyPack Web App | L4 | 測試＋手動走查 |
| HTTP Task API | L4 | `tests/gateway-parity.test.ts` |
| MCP TypeScript SDK client | L4 | `tests/gateway-parity.test.ts`、`npm run mcp:smoke` |
| 通用 SKILL.md | L1 | 匯出檔 |
| Claude Code、Claude Duet、Claude Plugins／Connectors | L0 | 未測 |
| ChatGPT dot、ChatGPT Apps／Plugins | L0 | 未測 |
| Grok Bot、Grok 開發工具 | L0 | 未測 |

不同產品各自測試，不因同品牌推論。
