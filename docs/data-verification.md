# 資料核對清單

所有懶人包的事實都附來源與核對日。2026-10-31 的資料由搜尋結果摘錄整理（建置環境的網路設定擋住了官方網站，無法逐頁開啟），因此每個來源都標示 `search_extract`。真實使用者測試前，請逐項開啟官方頁面核對，核對後把來源改為 `manual`、更新核對日並保存截圖。

要直接讀官方頁面，需在 session 的網路設定允許這些網域：`www.nta.go.jp`、`www.customs.go.jp`、`www.mlit.go.jp`、`www.gov.tw`、`www.nlma.gov.tw`、`gazette.nat.gov.tw`、`subway.osakametro.co.jp`、`osaka-amazing-pass.com`、`surutto-qrtto.com`、`www.surutto.com`、`support.apple.com`、`support.google.com`。

## 日本票券（travel.jp-ticket-optimizer）

2026-10-31 第二輪查證已修正：周遊卡購買網址（只在 スルッとQRtto 線上販售）、通天閣與天保山摩天輪確認免費、梅田藍天大廈 15:00 後 9 折、天保山 ¥1,000、JR 改依路線（京都→稲荷 ¥150／¥70、大阪→ユニバーサルシティ ¥200／¥100）、阪急兒童 ¥210、御座船 ¥1,800／¥900、HEP FIVE 已重新開放、KANSAI RAILWAY PASS LITE 含 Osaka Metro、新增ようおこし30hパス、各景點休館與季節票價。

仍未確認：
- [ ] KANSAI RAILWAY PASS LITE 兒童票（來源互相矛盾）
- [ ] 通天閣「特別屋外展望台」是否含在周遊卡內
- [ ] 天保山摩天輪營運商公告的新票價（¥1,000 來自周遊卡官網參考價）
- [ ] エンジョイエコカード 數位版是否仍販售
- [ ] 清水寺官方收費頁
- [ ] Osaka Metro 3–5 區兒童票價
- [ ] 二條城、天龍寺、三十三間堂、海遊館、USJ、阪急一日券、2027 年祝日（第二輪未查到）

## 日本退稅新制（travel.jp-tax-refund）

見 `src/core/packages/content/jpTaxRefund.ts` 的 `openQuestions`：6 個月滯在限制、轉售排除、各業者手續費與入帳時間、市區先退款的追回方式、Visit Japan Web 顯示內容、機場終端機位置、港口出境、罰則金額。

## 租金補貼（benefit.tw-rent-subsidy）

見 `src/core/packages/content/twRentSubsidy.ts` 的 `openQuestions`：無自有住宅是否全國判斷、線上申請網址與身分驗證、補貼起算月份、申訴管道、房東稅務、各縣市 3.5 倍門檻、額度表年度、116 年度公告。

## 訂閱取消（finance.subscription-cancel）

見 `src/core/packages/content/subscriptionCancel.ts` 的 `openQuestions`：串流是否屬 7 天解除權例外、數位發展部草案、各服務台灣退款條款、Amazon Prime Video、電信自助頁面、中文選單名稱。
