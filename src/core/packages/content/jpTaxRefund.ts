import type { GuidePack } from '../guides';

/**
 * Japan tax refund under the refund method (purchases from 2026-11-01).
 * Facts gathered 2026-10-31 from search results of NTA / MOF / Customs / JTA pages and
 * airport releases; the pages themselves could not be opened from the build environment.
 */
export const JP_TAX_REFUND: GuidePack = {
  id: 'travel.jp-tax-refund',
  checkedAt: '2026-10-31',
  task:
    '幫要去日本的台灣旅客做對 2026-11-01 起的新退稅制度（リファンド方式）：結帳時先付含稅全額，出境時通過海關確認，之後才由店家或退稅業者退稅 [S:nta-overview][S:customs]。你負責判斷是否適用、整理購物與出境當天要做的事、算出期限；海關確認與領退稅只能由使用者本人完成。',
  ask: {
    required: [
      '在日本購物的日期（或預計日期）',
      '離開日本的日期，以及從哪個機場或港口出境（有沒有先搭日本國內線）',
      '以什麼身分入境：持外國護照以「短期滯在」入境的觀光客（台灣護照觀光客通常是），或其他身分',
    ],
    optional: ['預計去哪些店、大約花多少', '是否為住在國外的日本國籍者'],
    outOfScope:
      '在日本工作、留學或長期居住（不是短期滯在）的人不適用，請直接說明。購物日期在 2026-10-31 以前的，適用舊制（結帳時直接免稅），這個懶人包不處理舊制細節。',
  },
  steps: [
    '**判斷適用哪個制度**：看購物日期，不看出境日期。2026-11-01 起買的才是新制；兩種制度沒有並行期 [S:nta-overview]。行程跨過 11-01 的，請使用者把 10-31 以前與 11-01 以後的收據分開保存。',
    '**確認資格**：外國人須以短期滯在等身分入境 [S:nta-qa][S:mof-2025]。護照上要有入境許可的貼紙或章；走自動通關閘門可能沒有，入境時請審查官蓋章 [S:nta-qa][S:emb-stamp]（已經入境才發現沒有章的補救方式未確認，請使用者向店家或入國管理局確認）。住國外的日本國籍者另有證明文件要求（見下方）[S:emb-abroad]。',
    '**購物時**：同一家店、同一天，未稅合計至少 ¥5,000 [S:mlit-en]。使用者講的多半是含稅價：一般商品（含藥品、化妝品）稅率 10%，食品飲料（不含酒類與內用）8% [S:tax-rates]，未稅＝含稅 ÷ 1.10 或 ÷ 1.08。打算在日本吃掉或用掉的東西，請另外結帳、不要辦免稅。出示護照本人（部分店家可用 Visit Japan Web 的免稅 QR 代替，但不保證退稅）[S:taxfree-qr]，付含稅全額。請使用者當場問店家四件事：用哪家退稅業者、退款方式（信用卡、帳戶、App、機場現金）、手續費、怎麼登記退款資料，並照指示登記；沒登記退款資料就不會退 [S:nta-overview][S:taxfree-qr]。收據要留著。',
    '**旅途中**：每張收據上的商品都要原封帶出境，不可使用或吃掉。同一張收據只要少一件，整張收據都無法確認、全部不退 [S:nta-qa][S:mlit-faq]。不可以自己寄回國（2025-03-31 起不適用）[S:nta-overview]。',
    '**如果已經有收據少了東西**（例如吃掉、送人）：直接告訴使用者那張收據拿不到退稅，其他完整的收據照常辦。出境辦手續時要主動告訴海關人員哪些商品不在，不要讓那張收據被當成已確認 [S:mlit-en]。沒有確認的收據就是一般含稅購物，不會退 [S:nta-qa]。能不能請店家改單、會不會另有處罰，目前未確認，不要回答成確定。',
    '**算期限**：購買日的隔天起算 90 天內要出境並完成海關確認；國稅廳的例子是 11/1 購買、期限到隔年 1/30 [S:nta-qa]。請幫使用者把每張收據的期限算出來，提醒最早到期的那一天。',
    '**出境當天，託運行李之前**：在最後離開日本的機場或港口，到出境大廳的免稅手續終端機刷自己的護照。綠色＝完成；紅色＝帶著商品到海關檢查區給海關看 [S:customs]。行李交給航空公司後就拿不回來辦手續 [S:mlit-faq]。成田、羽田、關西、中部、新千歲、福岡、那霸 7 個機場也可在出境大廳的專用 Wi-Fi 區用 Visit Japan Web 辦 [S:mlit-vjw]。先搭國內線的，在最後出境的國際機場辦 [S:mlit-faq]。商品真的少了要主動告訴海關，不要假裝都在 [S:mlit-en]。',
    '**領退稅**：由店家或它的退稅業者退款，不是海關或日本政府 [S:nta-overview]。機場現金只限合作的業者：羽田、成田、那霸有自助退現金機 [S:glory]，關西與神戶由 Cash Japan 提供，海關確認在報到前、領現金在出境審查後 [S:kix-cash]。刷卡、帳戶、App 退款會之後入帳，時間依業者而定。',
    '**沒收到退款**：聯絡購物的店家或退稅業者，不是海關。收據與紀錄要保留。',
    '**照「回報格式」整理給使用者**，並列出「尚未確認」的項目。',
  ],
  rules: [
    '不保證能退多少、多久入帳、手續費多少；只能說依店家與退稅業者而定，引用報導時要標明不是官方數字。',
    '11-01 起的購物不要說「結帳時直接免稅」。',
    '不要說託運行李後還能辦、或同一張收據少一件還能部分退。',
    '期限是「購買隔天起 90 天」，不是入境起算、也不是 6 個月。',
    '不鼓勵把不會帶出境的商品拿去海關確認，也不協助為了轉售而購買。',
    '機場終端機與退現金機的位置、時間以機場或海關公告為準，可附海關的地圖連結 [S:customs-map]；不要把部落格的樓層資訊當成確定。',
  ],
  sections: [
    {
      title: '新舊制度比較',
      body: `| 項目 | 2026-10-31 以前購物（舊制） | 2026-11-01 起購物（新制） |
| --- | --- | --- |
| 結帳 | 結帳時直接免稅 | 先付含稅全額，出境確認後才退 [S:nta-overview] |
| 最低金額 | 同店同日 ¥5,000 | 同店同日未稅 ¥5,000 [S:mlit-en] |
| 消耗品與一般品 | 分開計算，消耗品上限 ¥50 萬、需特殊包裝 | 取消區分、取消上限、不需特殊包裝 [S:mof-2025] |
| 「日常生活用」限制 | 有 | 取消，改為逐項排除（金條、白金條等仍不適用）[S:mof-outline] |
| 自己寄回國 | 2025-03-31 起不適用 | 不適用 [S:nta-overview] |
| 機場內免稅店（出境後） | — | 本來就免稅，不用辦退稅 [S:emb-ny] |`,
    },
    {
      title: '期限與數字',
      body: `| 項目 | 內容 | 來源 |
| --- | --- | --- |
| 海關確認期限 | 購買隔天起 90 天內，出境時辦 | [S:nta-qa] |
| 確認單位 | 以一張收據（一筆購買紀錄）為單位，少一件整張不退 | [S:nta-qa][S:mlit-faq] |
| 逾期 | 90 天內店家沒收到海關確認資料，視為一般含稅銷售，不退 | [S:nta-qa] |
| 確認後沒出境 | 會被追繳消費稅並可能受罰（罰則金額未確認） | [S:nta-qa] |
| 政府手續費 | 無；退稅業者的手續費由誰負擔，法律沒有規定 | [S:mlit-faq] |
| 全國終端機 | 約 36 個國際機場與港口、約 200 台；部分港口沒有常設 | [S:nikkei-terminals][S:customs-map] |`,
    },
    {
      title: '機場退現金（2026-11 起）',
      body: `| 地點 | 方式 | 注意 | 來源 |
| --- | --- | --- | --- |
| 羽田 T2、T3 | 自助退現金機（日圓） | 出境審查後；只限合作退稅業者的店；營業時間以機場公告為準 | [S:glory] |
| 成田 T1、T2 | 自助退現金機（日圓） | 出境審查前；只限合作退稅業者的店 | [S:glory] |
| 那霸 | 自助退現金機（日圓） | 同上 | [S:glory] |
| 關西、神戶 | Cash Japan：先在報到前做海關確認，出境審查後領現金；選卡片等方式要事先登記 | 只限合作業者 | [S:kix-cash] |

其他機場與城市退稅櫃台（例如 Global Blue 在部分 Yodobashi 門市）：先在市區拿到退款的人，出境時一樣要通過海關確認 [S:globalblue-city]。`,
    },
    {
      title: '手續費（報導，非官方）',
      body: `- 報導指出部分退稅業者會從退款扣約 1.5%–3% [S:newswitch-fee]；實際以店家與業者告知為準。
- 不要把任何百分比說成確定。`,
    },
    {
      title: '住國外的日本國籍者',
      body: `需證明在國外住滿 2 年（出國日到最後一次入境日），可用在留證明、戶籍附票影本，或 11-01 起的國外轉出者 My Number 卡；文件須是最後入境前 6 個月內開立 [S:emb-abroad]。`,
    },
  ],
  report: `## 你適用新制嗎
（依購物日期與入境身分判斷；不適用就說明原因）

## 你的收據
| 收據 | 購買日 | 未稅金額 | 可退／不可退（原因） | 期限 |

## 購物時要做的事
- 同店同日未稅滿 ¥5,000
- 出示護照，付含稅全額
- 問清楚：退稅業者、退款方式、手續費、怎麼登記退款資料，並當場登記
- 收據分開保存（10-31 以前／11-01 以後）

## 期限
- 最早到期：〈日期〉（購買隔天起 90 天）

## 出境當天
- 〈機場〉：託運行李前先到免稅終端機刷護照（或 Visit Japan Web）
- 紅色：帶商品到海關檢查區
- 退現金：〈是否有合作業者的機器／櫃台；以機場公告為準〉

## 退款方式與費用
（依店家與退稅業者而定，未保證）

## 尚未確認的地方
## 來源與核對日`,
  openQuestions: [
    '入境滿 6 個月的短期滯在者，在新制下是否同樣不適用（舊制不適用，新制應相同但未明確確認）。',
    '除了金條、白金條之外，「商業用途或轉售」是否仍明文排除。',
    '各退稅業者的手續費與入帳時間（報導數字未經官方或業者原文確認）。',
    '在市區先拿到退款、但出境時沒通過海關確認的話，如何追回（例如從信用卡扣回）。',
    'Visit Japan Web 會不會顯示退款是否完成（不同來源說法相反）。',
    '紅色結果時是否一定要出示紙本收據（建議都帶著）。',
    '各機場終端機與退現金機的確切位置與營業時間（部分來源互相矛盾）。',
    '已經入境、護照上沒有入境許可章的人，還能怎麼補救。',
    '收據上有商品不在時，能否請店家改單，以及是否另有處罰。',
    '從港口或郵輪碼頭離境（例如沖繩到台灣的船）時的辦法。',
    '違規未出境的罰則金額。',
  ],
  sources: [
    { id: 'nta-overview', title: '国税庁 免税制度（リファンド方式）概要 Q&A', url: 'https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/pdf/0025003-110_02.pdf', authority: '国税庁', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'nta-qa', title: '国税庁 免税販売手続に関する詳細 Q&A（2026-07 改訂）', url: 'https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/pdf/0026006-152_01.pdf', authority: '国税庁', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'mof-2025', title: '令和7年度税制改正 パンフレット（免税制度）', url: 'https://www.mof.go.jp/tax_policy/publication/brochure/zeisei2025/03.html', authority: '財務省', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'mof-outline', title: '令和7年度税制改正の大綱（消費税・免税）', url: 'https://www.mof.go.jp/tax_policy/tax_reform/outline/fy2025/07taikou_04.htm', authority: '財務省', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'customs', title: '税関 免税購入品の確認（リファンド方式）', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/jpn.htm', authority: '税関', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'customs-map', title: '税関 免税手続端末の設置場所', url: 'https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm', authority: '税関', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'mlit-faq', title: '観光庁 旅行者向け FAQ（リファンド方式）', url: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00023.html', authority: '観光庁', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'mlit-en', title: 'Japan Tourism Agency: Tax-free shopping (English)', url: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00028.html', authority: '観光庁', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'mlit-vjw', title: '観光庁 Visit Japan Web による税関確認', url: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00021.html', authority: '観光庁', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'emb-stamp', title: '在外日本公館：自動化ゲート利用時の上陸許可証印', url: 'https://www.denpasar.id.emb-japan.go.jp/itpr_ja/11_000001_00823.html', authority: '在デンパサール日本国総領事館', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'emb-abroad', title: '在外日本人の免税購入（リファンド方式）', url: 'https://www.us.emb-japan.go.jp/itpr_ja/menzei_refund.html', authority: '在米国日本国大使館', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'emb-ny', title: '在ニューヨーク日本国総領事館：リファンド方式のお知らせ', url: 'https://www.ny.us.emb-japan.go.jp/itpr_ja/102826.html', authority: '在ニューヨーク日本国総領事館', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'glory', title: 'Self Tax Refund 機（羽田・成田・那霸）', url: 'https://www.glory.co.jp/company/news/detail/id=3680', authority: 'グローリー／日本空港ビルデング', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'kix-cash', title: '関西空港・神戸空港 Cash Japan 退稅服務', url: 'https://www.kansai-airports.co.jp/en/news/j-261019-pressrelease-cashjapan/', authority: '関西エアポート', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'nikkei-terminals', title: '日経：税関確認端末 約200台', url: 'https://www.nikkei.com/article/DGXZQOUA217R80R21C26A0000000/', authority: '日本経済新聞', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'globalblue-city', title: 'Global Blue 市區退稅櫃台（ヨドバシカメラ）', url: 'https://prtimes.jp/main/html/rd/p/000000027.000022577.html', authority: 'Global Blue Japan', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'taxfree-qr', title: 'Visit Japan Web 免稅 QR 與退款登記（第三方說明）', url: 'https://taxfree.jp/en/faq/visit-japan-web-qr-for-tax-free/', authority: '第三方網站', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'tax-rates', title: '消費稅率：標準 10%、輕減 8%（食品飲料）', url: 'https://www.yayoi-kk.co.jp/lawinfo/shouhizei/keigenzeiritsu/index.html', authority: '弥生（會計軟體公司說明）', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'newswitch-fee', title: 'ニュースイッチ：退稅業者手續費報導', url: 'https://newswitch.jp/p/48841', authority: '日刊工業新聞', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
  ],
};
