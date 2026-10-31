import type { Pack } from '../types';

export default {
  id: 'travel.jp-tokyo-transit',
  area: 'travel',
  stage: '在日本',
  title: '東京交通票券省錢',
  value: ['省錢'],
  icon: 'tram',
  short: '刷 IC 卡還是買地鐵券？依每天行程算給你',
  description:
    '依使用者在東京每天的行程，到官方頁面查今天的票價，比較刷 IC 卡、東京地鐵 24／48／72 小時券、各種一日券哪個最省，並寫出算式；也提醒哪些路線不在券的範圍內。使用者問「東京地鐵券划算嗎」「這幾天要買 72 小時券嗎」「去台場要另外付錢嗎」時使用。',
  placeholder:
    '例：住淺草，12/4 淺草→上野→秋葉原→新宿，12/5 澀谷、原宿、表參道，12/6 台場；2 大人，台灣護照觀光，12/3 傍晚到東京',
  updated: '2026-10-31',
  ask: {
    required: [
      '每天要去的地方（依順序），以及住在哪一站附近',
      '大人與兒童人數（兒童幾歲）',
      '入境身分：是否以「短期滯在」入境（東京地鐵 24／48／72 小時券限外國旅客）',
    ],
    optional: [
      '抵達和離開東京的日期時間（小時券從第一次進站開始算）',
      '會不會去台場、晴空塔、吉祥寺等可能要搭 JR 或其他私鐵的地方',
      '打算用實體 IC 卡、手機錢包，還是信用卡感應',
    ],
    outOfScope: '機場到市區請用「機場進市區交通」懶人包；新幹線與 JR 長途請用「JR Pass 划算嗎」懶人包。',
  },
  steps: [
    '**拆成每一段**：把每天的移動拆成一段一段，標出每段是哪家：JR 東日本、東京 Metro、都營地鐵，或其他（百合海鷗號、臨海線、東武、京王、小田急、東急等）。同一段兩家都能到時，兩種都列，算完再選。',
    '**查每段大人 IC 票價**：先用 [S:fare-search] 查兩站之間。查不到時，地鐵段用營運公司的距離票價表估 [S:metro-fare][S:toei-fare]，JR 段用相鄰區段或距離估；都寫成「約」並寫出算式（例如「約 X km → 第 N 級距 → 票價」）。行程段數多、無法每段都查時，可以只查有代表性的幾段，其餘用級距估「約」，在報告裡標出哪些是估的。兒童票價大約是大人的一半，以官方為準。',
    '**扣轉乘折扣**：Metro 與都營之間直接轉乘有折扣，但要同一趟、不出站（或走轉乘專用閘門）、在時限內；查條件 [S:metro-transfer]，符合的段在地鐵合計裡扣掉，中途出站觀光的不算。',
    '**排票券窗口**：24／48／72 小時券從第一次進站起連續計時，一日券是當天到末班車。依使用者實際搭車的時間排窗口（例如傍晚抵達、隔天傍晚前離開，24 小時券就要對齊這段）。每個窗口加總：地鐵（Metro＋都營）S、JR J、其他 O。',
    '**查今天的票券價格與規定**：東京地鐵 24／48／72 小時券 [S:tst]、Metro 24 小時券 [S:metro-1day]、都營一日券、Metro・都營共通一日券和東京フリーきっぷ [S:toei-tickets]、JR 都區內パス [S:jr-passes]、百合海鷗號一日券 [S:yurikamome]。',
    '**比較**（公式見「怎麼比較」）：有小時券時，把能改搭地鐵的 JR 段改成地鐵，再算一次。',
    '**付款**：地鐵可以刷信用卡感應進站，但扣大人票價、沒有兒童價 [S:tap]；JR 東日本現在能不能刷，查 [S:tap-list]。IC 卡怎麼選見「日本付款不吃虧」懶人包。',
    '**照「回報格式」整理給使用者**：每個窗口的算式與結論；差不多時建議直接刷 IC 卡（比較有彈性）；標出哪些票價是「約」。',
  ],
  compare: {
    how: '對每個票券窗口 W：IC 單買＝S＋J＋O。東京地鐵小時券＝券價＋J＋O（S 全部涵蓋）；48／72 小時券要把整個窗口內每天的 S 加總後再比，不是每天分開比。Metro 24 小時券＝券價＋都營部分＋J＋O（只涵蓋 Metro）。都營一日券＝券價＋Metro 部分＋J＋O（涵蓋都營地鐵、都營巴士、荒川線）。JR 都區內パス：把 J 換成券價（只限 23 區內 JR 普通、快速）。東京フリーきっぷ只在同一天「min(S, 地鐵券價)＋min(J, 都區內パス價)」大於フリーきっぷ價時才划算；地鐵券價：能買小時券的用 24 小時券價，不能買的用 Metro・都營共通一日券價。回本點＝券價 ÷ 平均每段票價（要搭幾段才回本）。最省＝各組合中總價最小者；估的票價標「約」，算式寫出來。',
    columns: ['窗口（日期時間）', '地鐵合計 S', 'JR 合計 J', '其他 O', '各方案總價', '最省方案', '比 IC 單買省多少', '來源與查詢日'],
  },
  knowhow: [
    '東京地鐵 24／48／72 小時券（Tokyo Subway Ticket）只賣給外國旅客（購買時看護照），從第一次進站起連續計時，涵蓋東京 Metro 和都營地鐵全線；購買地點和方式以官方頁面為準 [S:tst]。',
    '小時券不含 JR、百合海鷗號、臨海線、東武、京成、單軌電車、機場特急和巴士；Metro 24 小時券只含 Metro、不含都營 [S:tst][S:metro-1day]。',
    '能買小時券的旅客，先比 Metro・都營共通一日券和 24 小時券的價格：兩者都含 Metro＋都營，選便宜的；小時券從第一次進站起算，一日券只到當天末班 [S:tst][S:toei-tickets]。',
    '都營一日券（都営まるごときっぷ）還含都營巴士、荒川線和日暮里・舍人線，適合都營多、要搭巴士的日子 [S:toei-tickets]。',
    'JR 都區內パス只限 23 區內的 JR 普通、快速列車；搭特急要另付，出了 23 區也要補票 [S:jr-passes]。',
    'Metro 和都營是兩家公司，票價表分開；直接轉乘才有折扣，中途出站就分開算 [S:metro-transfer][S:metro-fare][S:toei-fare]。',
    '台場的百合海鷗號不在任何地鐵券內，要另外付或買它的一日券 [S:yurikamome]。',
    '信用卡感應進站扣大人票價，沒有兒童價；帶小孩的用兒童 IC 卡或兒童票 [S:tap]。',
    'JR 東日本 2026-03-14 調整過票價；用調整後的票價，舊文章的票價不要用 [S:jr-passes]。',
  ],
  sources: [
    {
      id: 'tst',
      name: '東京 Metro：Tokyo Subway Ticket（東京地鐵 24／48／72 小時券）',
      owner: '東京地下鉄',
      official: true,
      url: 'https://www.tokyometro.jp/lang_en/ticket/value/travel/index.html',
      find: ['今天的價格（24／48／72 小時，大人／兒童）', '購買資格', '購買地點與方式（含 QR 版）', '涵蓋範圍'],
      expect: ['Tokyo Subway Ticket'],
      search: 'Tokyo Subway Ticket official price Tokyo Metro',
    },
    {
      id: 'metro-1day',
      name: '東京 Metro：24 小時券與一日券',
      owner: '東京地下鉄',
      official: true,
      url: 'https://www.tokyometro.jp/lang_en/ticket/value/1day/index.html',
      find: ['Metro 24 小時券的今天價格（大人／兒童）', '有效時間怎麼算（售票機買的、預售的）', 'Metro・都營共通一日券'],
      expect: ['24-hour'],
      search: 'Tokyo Metro 24-hour Ticket official',
    },
    {
      id: 'toei-tickets',
      name: '東京都交通局：都營優惠票券',
      owner: '東京都交通局',
      official: true,
      url: 'https://www.kotsu.metro.tokyo.jp/eng/tickets/value.html',
      find: ['都營一日券（Toei One-Day Pass）的價格與範圍', 'Metro・都營共通一日券的價格', '東京フリーきっぷ（Tokyo Combination Ticket）的價格與範圍', '能不能存進 IC 卡'],
      expect: ['Toei'],
      search: 'Toei One-Day Pass Tokyo Combination Ticket price',
    },
    {
      id: 'jr-passes',
      name: 'JR 都區內パス、東京フリーきっぷ 2026 年調價（トラベル Watch）',
      owner: 'トラベル Watch',
      official: false,
      url: 'https://travel.watch.impress.co.jp/docs/news/2092606.html',
      find: ['JR 都區內パス、東京フリーきっぷ調整後的價格與生效日', '範圍'],
      expect: ['都区内パス'],
      search: '都区内パス JR東日本 価格 2026',
    },
    {
      id: 'yurikamome',
      name: '百合海鷗號（英文）',
      owner: 'ゆりかもめ',
      official: true,
      url: 'https://www.yurikamome.co.jp/en/',
      find: ['一日券的價格（大人／兒童）', '新橋到台場各站的票價', '信用卡感應乘車與每日上限'],
      expect: ['Yurikamome'],
      search: 'Yurikamome one-day pass fare official',
    },
    {
      id: 'metro-fare',
      name: '東京 Metro：普通運賃',
      owner: '東京地下鉄',
      official: true,
      url: 'https://www.tokyometro.jp/ticket/types/regular/index.html',
      find: ['距離級距與 IC 票價（大人／兒童）', '車票和 IC 卡的差別'],
      expect: ['運賃'],
      search: '東京メトロ 普通運賃 IC',
    },
    {
      id: 'toei-fare',
      name: '東京都交通局：都營地下鐵普通運賃',
      owner: '東京都交通局',
      official: true,
      url: 'https://www.kotsu.metro.tokyo.jp/subway/fare/regular.html',
      find: ['距離級距與 IC 票價（大人／兒童）'],
      expect: ['運賃'],
      search: '都営地下鉄 普通運賃 IC',
    },
    {
      id: 'metro-transfer',
      name: '東京 Metro：與都營的轉乘票價',
      owner: '東京地下鉄',
      official: true,
      url: 'https://www.tokyometro.jp/lang_en/ticket/types/connection/index.html',
      find: ['轉乘折扣的條件（時限、不出站、轉乘閘門）', '折扣多少（大人／兒童）'],
      expect: ['Toei'],
      search: 'Tokyo Metro Toei transfer discount fare',
    },
    {
      id: 'tap',
      name: '東京都：都營地下鐵信用卡感應乘車（2025-12 新聞稿）',
      owner: '東京都',
      official: true,
      url: 'https://www.metro.tokyo.lg.jp/information/press/2025/12/2025121615',
      find: ['可用的卡別', '扣款方式（大人票價、兒童能不能用）', '怎麼查乘車紀錄'],
      expect: ['タッチ決済', '都営地下鉄'],
      search: 'Toei Subway tap-and-go credit card payment',
    },
    {
      id: 'tap-list',
      name: 'japan-guide：日本各鐵路信用卡感應乘車一覽',
      owner: 'japan-guide.com',
      official: false,
      url: 'https://www.japan-guide.com/e/e2359_credit_card_tap.html',
      find: ['東京哪些鐵路能刷信用卡感應進站（JR 東日本是否已支援）'],
      expect: ['credit card'],
      search: 'Tokyo credit card tap to ride JR East Tokyo Metro',
    },
    {
      id: 'fare-search',
      name: 'Yahoo!乗換案内（站到站 IC 票價）',
      owner: 'LINEヤフー',
      official: false,
      url: 'https://transit.yahoo.co.jp/search/result?from=%E6%96%B0%E5%AE%BF&to=%E6%B5%85%E8%8D%89',
      find: ['站到站的運賃、IC 運賃與特急料金（把網址裡 from=、to= 換成日文站名再開）'],
      expect: ['運賃'],
      search: 'Yahoo 乗換案内 新宿 浅草 IC運賃',
    },
  ],
  report: `## 結論
最省：〈方案〉，全程總價〈金額〉（最省就是刷 IC 卡時，寫出和次佳方案差多少）
票價查詢日：〈日期〉

## 每天的移動與票價
| 日期 | 區段 | 公司 | 大人 IC 票價（查到或「約」） | 來源 |

## 算式
| 窗口 | S（地鐵） | J（JR） | O（其他） | IC 單買 | 各票券方案 | 最省 |

## 不在券內、要另外付的
## 怎麼買、怎麼付
## 估算與尚未確認的地方
## 來源（網址＋查詢日）`,
  related: [
    { id: 'travel.jp-airport-transfer', why: '成田、羽田到市區怎麼去' },
    { id: 'travel.jp-rail-pass', why: '離開東京的新幹線、JR 長途' },
    { id: 'travel.jp-payment', why: 'IC 卡怎麼選、信用卡感應怎麼付' },
  ],
} satisfies Pack;
