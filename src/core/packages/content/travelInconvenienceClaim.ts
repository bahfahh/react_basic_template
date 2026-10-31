import type { GuidePack } from '../guides';

/**
 * Claiming Taiwan travel inconvenience insurance (credit-card attached and stand-alone)
 * after flight or baggage delays. Facts gathered 2026-10-31 from search results of bank,
 * insurer, airline and legal pages; the pages themselves could not be opened from the build
 * environment.
 */
export const TRAVEL_INCONVENIENCE_CLAIM: GuidePack = {
  id: 'travel.tw-travel-inconvenience-claim',
  checkedAt: '2026-10-31',
  task:
    '幫台灣旅客在班機延誤、取消、行李延誤或遺失、護照遺失後，用信用卡附加的旅遊不便險（或另外買的不便險）把該拿的錢拿回來：當下在機場要拿到哪些證明、能花哪些錢、回國後怎麼申請理賠，被拒絕時怎麼申訴。',
  ask: {
    required: [
      '發生了什麼：班機延誤／取消、行李延誤／遺失、護照遺失；在哪個機場、去程還是回程',
      '機票（或 80% 以上團費）是用哪一張信用卡付全額；是不是里程票只付稅金',
      '哪些人要申請：持卡人、配偶、未婚且未滿 25 歲的子女，或其他人',
      '延誤多久（依原訂起飛時間算）、行李多久後才送到',
      '現在人還在機場，還是已經回國',
    ],
    optional: ['有沒有另外買旅遊不便險（定額給付或實支實付）', '航空公司有沒有提供餐券或住宿', '已經花了哪些錢、有沒有收據'],
    outOfScope: '旅平險（旅行平安險）保的是人身傷害與醫療，不保延誤；如果使用者只有旅平險，直接說明不適用。',
  },
  steps: [
    '**先確認有沒有保障**：多數卡要用同一張卡付全額公共運輸票款或 80% 以上團費 [S:fubon-claims][S:esun-travel][S:ctbc-incon]。被保險人通常是持卡人（正附卡）、配偶與未婚且未滿 25 歲的子女，父母、朋友不在內 [S:fubon-claims][S:ctbc-faq]。里程票只付稅金、或透過某些第三方平台付款，常常不符合「全額」[S:roo-card-insurance]。機票如果退刷，就不能申請 [S:fubon-claims]。保障每年更新，以事故當天有效的版本為準 [S:fubon-claims][S:cathay-travel]。',
    '**人還在機場（班機延誤或取消）**：向航空公司櫃台拿書面延誤／取消證明（要有原訂與實際時間、原因）；保留原班機與實際搭乘班機的登機證，兩張要是同一個機票號碼 [S:fubon-claims]。盡量改搭別的班機、不要退票，退票就不能理賠 [S:fubon-claims][S:esun-insurance]。只花合理的餐費、住宿、機場與飯店間交通，拿明細收據；日用品只有在需要過夜且行李已託運時才給付 [S:fubon-claims]。',
    '**人還在機場（行李沒到）**：離開行李提領區前，到行李服務櫃台填行李事故報告（PIR），拿副本與案件編號，保留行李條 [S:ita-pir][S:ctbc-incon]。抵達 6 小時後行李仍沒到，才在抵達後 24 小時內買必需品，留明細收據 [S:taishin-cert][S:esun-insurance]。行李送到時要拿到有日期與時間的送達證明。',
    '**算門檻**：班機延誤多半是 4 小時以上，富邦是「逾四小時（不含四小時）」[S:fubon-claims][S:ctbc-incon]；起飛後因天候改降不算延誤 [S:esun-insurance]。行李延誤 6 小時、行李遺失是抵達後 24 小時仍未送達 [S:taishin-cert]。**回台灣的回程行李延誤不在保障內**，請向航空公司求償 [S:esun-insurance][S:cathay-ins-claim]。',
    '**護照遺失**：在日本向警察報案、拿正本報案證明，保留補辦文件的收據 [S:dbs-form]。',
    '**回國後申請**：找出事故當年度的保險證、確認保險公司（見下表），下載該銀行版本的理賠申請書，照「文件清單」備齊後線上或掛號寄送。盡早申請：有些卡要求 60 天內通知（例如玉山行李事故）[S:esun-insurance]；法律上請求權 2 年內有效 [S:law-65]。資料齊全後，保險公司應在約定期限或 15 天內給付，延遲要付年息 10% [S:law-34]。',
    '**被拒絕時**：先書面向保險公司申訴，30 天內沒有回覆或不接受，60 天內向金融消費評議中心申請評議，不用費用 [S:foi-process]。',
    '**也問航空公司**：日本沒有像歐盟 EU261 那樣的法定現金賠償，餐食住宿多由航空公司自行決定 [S:asia-rights]。全日空自身原因延誤會提供餐食，必要時提供住宿 [S:ana-delay]；樂桃 2026-08-19 起對自身原因的重大延誤或取消，補償住宿與交通（國際線上限 ¥20,000，30 天內申請）[S:peach-2026]。',
    '**照「回報格式」整理給使用者**，並列出「尚未確認」的項目。',
  ],
  rules: [
    '不要說「一定會拿到 NT$X」；保額是實支實付的上限，依卡別、等級、年度不同。',
    '不要說延誤剛好 4 小時一定符合，也不要說天候改降算延誤。',
    '不要說父母、朋友、25 歲以上的子女在保障內。',
    '不要說里程票只付稅金、或已退刷的機票可以申請。',
    '不要說旅平險保延誤或行李；不要說行李遺失會賠行李本身的價值。',
    '不要說回台灣的回程行李延誤在保障內。',
    '不要說日本有法定的現金賠償，或航空公司一定要負擔天候造成的費用。',
    '客服電話與通知期限一律以使用者自己的保險證為準，不要用記憶中的號碼。',
  ],
  sections: [
    {
      title: '各銀行的承保保險公司（2026 年度）',
      body: `| 銀行 | 保險公司 | 來源 |
| --- | --- | --- |
| 國泰世華 | 國泰產險 | [S:cathay-travel] |
| 花旗、滙豐、渣打 | 國泰產險（各有理賠申請書） | [S:cathay-ins-claim] |
| 玉山 | 新安東京海上產物 | [S:esun-insurance] |
| 台新 | 新光產物 | [S:taishin-cert] |
| 中國信託 | 中國信託產物 | [S:ctbc-cert] |
| 富邦 | 富邦產險 | [S:fubon-claims] |
| 星展 | 安達產險（Chubb） | [S:dbs-chubb] |

保額依卡別差很多，例如部分卡每人 NT$7,000～20,000、家庭合計另有上限；也有卡完全沒有不便險 [S:ctbc-incon][S:cathay-travel][S:esun-travel]。請以使用者的保險證為準。`,
    },
    {
      title: '文件清單',
      body: `- [ ] 理賠申請書（該銀行、該年度版本）
- [ ] 刷卡帳單或簽單：證明用該卡付全額票款或 80% 以上團費（含授權碼）
- [ ] 電子機票或行程表
- [ ] 原班機與實際班機的登機證（同一個機票號碼）；候補或改票證明
- [ ] 航空公司延誤／取消證明正本
- [ ] 餐費、住宿、交通、必需品的明細收據或發票正本（日文收據是否要翻譯未確認，可在申請書上逐項寫品名與金額）
- [ ] 行李條與行李事故報告（PIR）副本
- [ ] 行李送達證明（有日期與時間）
- [ ] 護照遺失：警察報案證明正本與補辦收據
- [ ] 身分證影本、存摺封面影本
- [ ] 替配偶或子女申請：戶口名簿或結婚證明
- [ ] 另外買的定額給付不便險：通常只要延誤證明與登機證（以保單為準）

來源：[S:cathay-claim-form][S:ctbc-cert]`,
    },
    {
      title: '卡片附加 vs 另外買的不便險',
      body: `| 項目 | 信用卡附加 | 另外買（定額給付） |
| --- | --- | --- |
| 給付方式 | 實支實付，要收據 | 例如每滿 4 小時 NT$6,000、最高 NT$12,000 [S:esun-standalone] |
| 文件 | 收據、延誤證明、登機證等 | 多半只要延誤證明與登機證 |
| 2026-04-01 起 | 不受影響 | 每人每趟最多 2 張、同一家最多 1 張；延誤、行李延誤、行李遺失各上限 NT$6,000 起 [S:udn-2026-rule] |`,
    },
  ],
  report: `## 你可以申請嗎
（付款卡、被保險人、事件與門檻；不符合就說明原因）

## 現在立刻要做的事（還在機場時）
- 延誤證明、登機證、PIR、收據……

## 可以申請的項目與上限（以保險證為準）
## 文件清單（打勾）
## 怎麼送、多久內要送
## 被拒絕時怎麼做
## 也可以向航空公司要求的
## 尚未確認的地方
## 來源與核對日`,
  openQuestions: [
    '日文收據是否需要翻譯或附品名清單。',
    '航空公司提供的餐食或住宿是否會減少保險給付；同時有卡片與另外買的實支實付保單時如何分攤。',
    '富邦的條款是否要求延誤期間的花費也用該卡支付。',
    '各銀行的通知期限、處理時間與客服電話（請看保險證）。',
    '長榮、華航、星宇、台灣虎航、捷星的延誤承諾。',
    '透過 Trip.com、Klook 等平台訂的機票是否算「用該卡付全額」。',
    '金融消費評議中心的評議專線與保險公司必須接受的評議金額上限。',
  ],
  sources: [
    { id: 'fubon-claims', title: '富邦產險：信用卡附加保險理賠說明', url: 'https://www.fubon.com/insurance/policyholder/claims-process/credit-card-claims/index.html', authority: '富邦產險', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'esun-travel', title: '玉山：信用卡旅遊保險', url: 'https://www.esunbank.com.tw/bank/personal/credit-card/benefit/travel-insurance', authority: '玉山銀行', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'esun-insurance', title: '玉山：旅遊不便險保險證（PDF）', url: 'https://www.esunbank.com/zh-tw/-/media/ESUNBANK/Files/Credit-Card/travel-card/insurance.pdf', authority: '玉山銀行／新安東京海上', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'esun-standalone', title: '玉山：旅行綜合保險（定額給付）', url: 'https://www.esunbank.com/zh-tw/personal/insurance/online/travel-accident-and-inconvenience', authority: '玉山銀行', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'ctbc-incon', title: '中信：信用卡旅遊不便險', url: 'https://www.ctbcbank.com/twrbo/zh_tw/cc_index/cc_additional/cc_add_index/cc_add_ins_incon.html', authority: '中國信託銀行', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'ctbc-faq', title: '中信：被保險人範圍 FAQ', url: 'https://service.ctbcbank.com/FAQ/Page01?kmid=4801', authority: '中國信託銀行', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'ctbc-cert', title: '中信：115 年度旅遊保險證（PDF）', url: 'https://www.ctbcbank.com/content/dam/twrbo/pdf/creditcard/cc_add_ins_travel_insurance.pdf', authority: '中國信託銀行／中國信託產物', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'cathay-travel', title: '國泰世華：信用卡旅遊保險', url: 'https://www.cathaybk.com.tw/cathaybk/personal/credit-card/cards/rights/travel-insurance/', authority: '國泰世華銀行', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'cathay-ins-claim', title: '國泰產險：信用卡保險理賠文件查詢', url: 'https://www.cathay-ins.com.tw/cathayins/personal/claim/creditcardins/', authority: '國泰產險', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'cathay-claim-form', title: '國泰產險：理賠申請書（PDF）', url: 'https://www.cathay-ins.com.tw/cathayins/-/media/5e6020850a1941008e86ed75b8d5462f.pdf', authority: '國泰產險', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'taishin-cert', title: '台新：新光產物旅遊保險證（2026-06-26）', url: 'https://www.taishinbank.com.tw/TSB/export/sites/TSB/files/creditcard/SKinsurance_20260626.pdf', authority: '台新銀行／新光產物', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'dbs-chubb', title: '星展信用卡保險條款（安達產險）', url: 'https://chubb.com/content/dam/chubb-sites/chubb-com/tw-zh/personal/dbs-credit-card-insurance/1.dbsnacpolicywording_20241220.pdf', authority: '安達產險', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'dbs-form', title: '星展：保險理賠說明（旅行文件重置）', url: 'https://www.dbs.com.tw/iwov-resources/pdf/Card_Insurance_02.pdf', authority: '星展銀行', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'roo-card-insurance', title: '信用卡旅遊保險常見問題（第三方整理）', url: 'https://roo.cash/blog/credit-card-travel-insurance-article', authority: '第三方網站', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'udn-2026-rule', title: '經濟日報：定額給付不便險 2026-04-01 新規', url: 'https://money.udn.com/money/story/5613/9282973', authority: '經濟日報', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'law-65', title: '保險法第 65 條：請求權時效 2 年', url: 'https://www.legis-pedia.com/article/other/1155', authority: '法律百科', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'law-34', title: '保險法第 34 條：15 天內給付', url: 'https://smart.businessweekly.com.tw/Reading/IndepArticle.aspx?id=38171', authority: 'Smart 自學網', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'foi-process', title: '金融消費評議中心申訴流程', url: 'https://www.legis-pedia.com/article/other/1153', authority: '法律百科', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'asia-rights', title: '亞洲乘客權益整理（日本無 EU261）', url: 'https://myflyright.com/blog/passenger-rights-in-asia/', authority: '第三方網站', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'ana-delay', title: 'ANA：國際線延誤時的協助', url: 'https://www.ana.co.jp/ja/jp/guide/boarding-procedures/support/international/', authority: '全日空', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'peach-2026', title: '樂桃：2026-08-19 起延誤補償（Aviation Wire）', url: 'https://www.aviationwire.jp/archives/348210', authority: 'Aviation Wire', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'ita-pir', title: '行李事故報告（PIR）說明', url: 'https://www.ita-airways.com/jp/ja/book-and-prepare/travel-information/baggage/baggage-assistance', authority: 'ITA Airways', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
  ],
};
