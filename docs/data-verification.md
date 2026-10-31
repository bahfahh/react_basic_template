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

## 日本自由行新增的 5 個懶人包

各檔案的 `openQuestions` 列出未確認的項目：
- `jpPayment.ts`：0.5% 銀行手續費的官方規定、日本 ATM 手續費、JR 東西日本感應乘車、行動支付的匯差。
- `jpRailPass.ts`：JR 官方網站舊價是否仍有效、14／21 日兒童價、WEST QR 規定、部分周遊券 2026 價格、東京↔京都等區段票價。
- `jpAirportTransfer.ts`：N'EX 單程價、羽田利木津價格、計程車定額表、HARUKA 一般價、關西利木津、新千歲 JR 票價、末班車時間。
- `jpTokyoTransit.ts`：部分區段票價、轉乘折扣兒童金額、感應扣款票價、晴空塔各日票價。
- `travelInconvenienceClaim.ts`：日文收據、與航空公司補償的分攤、各銀行通知期限與客服電話、OTA 購票是否符合。

要直接讀這些官方頁面，需另外允許：`www.keisei.co.jp`、`www.jreast.co.jp`、`www.westjr.co.jp`、`global.jr-central.co.jp`、`japanrailpass.net`、`www.kotsu.metro.tokyo.jp`、`www.tokyometro.jp`、`www.fubon.com`、`www.ctbcbank.com`、`www.esunbank.com`、`www.taishinbank.com.tw`。
