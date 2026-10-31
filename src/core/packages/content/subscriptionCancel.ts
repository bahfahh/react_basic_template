import type { GuidePack } from '../guides';

/**
 * Finding and cancelling subscriptions in Taiwan. Facts gathered 2026-10-31 from search
 * results of official help pages and Taiwan government sources; the pages themselves could
 * not be opened from the build environment.
 */
export const SUBSCRIPTION_CANCEL: GuidePack = {
  id: 'finance.subscription-cancel',
  checkedAt: '2026-10-31',
  task:
    '幫在台灣的人找出正在扣款的訂閱，照官方路徑取消、趕在下次扣款前完成，必要時說明退款與申訴管道。最後的「取消」按鈕由使用者本人按；你負責找路徑、算截止時間、提醒取消後會失去什麼。',
  ask: {
    required: [
      '想取消哪些服務；或請你帶他盤點所有訂閱',
      '每個服務是從哪裡付錢：App Store、Google Play、電信帳單、PayPal，或信用卡直接付給服務（不知道就先帶他查）',
      '下次扣款日（不知道就教他在服務或帳單上查）',
    ],
    optional: ['想不想申請退款', '月繳還是年繳、是否家庭方案、是否試用中'],
    outOfScope: '不處理別人的帳號或公司帳號；不代替使用者打電話給電信、銀行或商家。',
  },
  steps: [
    '**盤點訂閱藏在哪**：依序看 Apple 訂閱 [S:apple-subs]、Google Play 訂閱 [S:google-subs]、PayPal 自動付款 [S:paypal-auto]、電信小額付費與加值服務 [S:cht-vas][S:twm-mp][S:fet-pay]，最後看信用卡帳單上的定期扣款。',
    '**找出誰在收錢**：誰收錢就在哪裡取消 [S:netflix-cancel][S:spotify-faq][S:youtube-cancel]。從 App Store 或 Google Play 訂的，要在那裡取消；電信代收的，要找電信；PayPal 取消只是停止 PayPal 付款，商家那邊也要取消。',
    '**算截止時間**：照下方「截止時間」表，告訴使用者最晚哪一天、幾點前要取消。',
    '**照官方路徑取消**：照下方「各服務取消方式」表帶使用者操作。按下最後的取消前，先說清楚會失去什麼（例如 iCloud 或 Google One 降級後超過容量，備份與收信會停）[S:icloud-plan][S:google-one]。',
    '**確認完成**：要看到取消成功畫面或確認信，記下服務到期日，請使用者截圖保存。刪除 App、登出、刪帳號都不等於取消訂閱 [S:google-subs][S:netflix-cancel][S:openai-cancel]。',
    '**想退款時**：照該服務的規定（表中）；App Store 用 reportaproblem.apple.com 申請 [S:apple-refund]，Google Play 購買 48 小時內可向 Google 申請，之後找開發者 [S:google-refund]。不保證會退。',
    '**台灣規定與申訴**：通訊交易有 7 天解除權，但經消費者事先同意即提供的數位內容或線上服務可能是例外 [S:moj-exception]；串流訂閱是否屬於例外，目前沒有找到主管機關解釋。爭議先找商家，再打 1950 或上行政院消保會線上申訴 [S:cpc-complaint]；信用卡爭議款要在當期繳款截止日前向發卡銀行提出 [S:fsc-card]，不要直接不繳卡費。',
    '**照「回報格式」整理給使用者**，並列出「尚未確認」的項目。',
  ],
  rules: [
    '最後的取消、降級、刪除按鈕一定由使用者本人在確認服務、帳號與後果後自己按。',
    '不把刪除 App、登出或刪除帳號當成取消；使用者只要取消時，不要建議刪帳號。',
    '沒看到取消成功畫面或確認信，不說「已取消」。',
    '不保證退款；不要說 7 天解除權或數位發展部的草案一定適用。',
    '不建議用停繳卡費代替取消；使用者沒確認是盜刷，不要說成未經授權的交易。',
    '電話號碼只用官方網站上的；網路上有假的「取消專線」。',
    '數位發展部「自動續訂」的定型化契約修正目前是草案，不是現行法規 [S:taipeitimes-draft]。',
  ],
  sections: [
    {
      title: '訂閱藏在哪、怎麼查',
      body: `| 地方 | 怎麼查與取消 | 注意 |
| --- | --- | --- |
| Apple（App Store） | iPhone：設定 → 最上方你的名字 → 訂閱項目 → 選項目 → 取消訂閱 [S:apple-subs] | 找不到時，搜尋信箱裡 Apple 的收據，看是哪個 Apple 帳號；試用要在結束前至少 24 小時取消 [S:apple-subs] |
| Google Play | Play 商店 → 個人頭像 → 付款和訂閱 → 訂閱 → 取消訂閱；或網頁 play.google.com [S:google-subs] | 解除安裝 App 不會取消；已付的期間仍可使用 [S:google-subs] |
| PayPal | 設定 → 付款 → 管理自動付款 → 選商家 → 取消 [S:paypal-auto] | 只停止 PayPal 付款，商家帳號可能仍在，要另外取消 |
| 中華電信 | 小額付款預設關閉；要關閉打手機 123、市話 0800-080-123 或帶證件到門市 [S:cht-vas] | 內容爭議先找內容商 |
| 掛在電信帳單的方案（例如 KKBOX、MOD 加值） | 打電信客服或到門市，說要「取消帳單上的〈服務〉方案」；中華電信手機 123、市話 0800-080-123；MOD 在 MOD 設定選單取消 [S:kkbox-cancel] | 「關閉小額付款」和「取消已訂的方案」是否相同未確認，請跟客服確認兩件事都處理 |
| 台灣大哥大 | 手機撥 188 語音選單「關閉小額付費功能」；myfone 會員中心可設額度 [S:twm-mp] | — |
| 遠傳 | 888 語音選單開關小額付費代收；遠傳心生活 App 管理代收與加值服務 [S:fet-pay] | 換約或換卡時可能被加加值服務，當場確認 |
| 信用卡帳單 | 在銀行 App 或帳單找每月固定的扣款，判斷是哪一層在收錢 | 帳單上的商家名稱對照，未確認 |`,
    },
    {
      title: '各服務取消方式',
      body: `| 服務 | 哪裡取消 | 取消後與退款 |
| --- | --- | --- |
| Netflix | 帳戶 → 管理會員資格 → 取消；沒有取消選項代表是合作夥伴收費（Apple、Google、電信），去那裡取消 [S:netflix-cancel] | 用到該期結束 [S:netflix-cancel] |
| Spotify | 先看 iPhone 設定 → 你的名字 → 訂閱項目：有 Spotify 就在 Apple 取消 [S:apple-subs]；沒有就到 spotify.com/account → 管理方案 → 取消；電信或合作夥伴收費要找他們 [S:spotify-faq] | 用到下次扣款日後轉免費版；**NT$0 試用期間取消會立刻結束 Premium** [S:spotify-faq] |
| YouTube Premium | youtube.com/paid_memberships → 管理會員資格 → 停用 → 繼續取消 [S:youtube-cancel] | 權益用到該期結束；Apple 收費要在 Apple 取消 [S:youtube-cancel] |
| Disney+ | 帳戶 → 取消訂閱 → 完成取消；App 商店收費要在商店取消 [S:disney-terms] | 該期或試用結束時生效 |
| iCloud+ | iOS 18.4 起：設定 → 你的名字 → 訂閱項目 → iCloud+ [S:icloud-plan] | 期末生效；超過容量會停止同步與備份 [S:icloud-plan] |
| Google One | one.google.com → 設定 → 取消會員資格 [S:google-one] | 超過 15GB：Gmail 無法收發、相簿不再備份 [S:google-one] |
| ChatGPT Plus | chatgpt.com → 設定 → 帳號 → 管理／取消；在網頁訂的要在網頁取消，Apple 收費到 Apple 取消 [S:openai-cancel] | 用到該期結束；一般不退款，計費錯誤等例外 |
| Microsoft 365 | account.microsoft.com/services → 管理 → 取消訂閱或關閉定期付款 [S:ms-billing] | 用到到期日；退款規定說法不一，以微軟告知為準 |
| Adobe | account.adobe.com → 方案 → 管理方案 → 取消；付款處理中不能取消 [S:adobe-cancel] | 首次購買 14 天內多數可全額退 [S:adobe-cancel]；年約月繳提前取消可能有違約金，金額以 Adobe 取消頁顯示為準 |
| KKBOX | 會員中心 → KKBOX 方案紀錄 → 方案管理 → 取消訂閱；中華電信、MOD 代收要找電信 [S:kkbox-cancel] | **扣款前一天與當天不能取消**；用到到期，剩餘天數不退 [S:kkbox-cancel] |
| LINE MUSIC | LINE MUSIC 取消頁；App Store 收費到 iPhone 設定取消 [S:line-music] | **下次扣款日前一天 23:59 前**取消 [S:line-music] |
| LINE 貼圖超值方案 | LINE → 設定 → 貼圖 → 管理訂購方案 [S:line-sticker] | App 內購買至少 48 小時前；LINE STORE 購買前一天 21:59 前；到期後貼圖不能用 [S:line-sticker] |
| LINE Premium | 到 App Store 或 Google Play 的訂閱取消 [S:line-premium] | 至少 24 小時前取消 [S:line-premium]；只在 LINE 裡面取消可能還會扣款 [S:nownews-line] |
| Nintendo Switch Online | Nintendo eShop → 帳號 → Nintendo Switch Online → 停止自動續訂 [S:nintendo-tw] | 用到到期；家庭方案只有購買者能停止 |
| friDay影音 | 會員專區 → 帳號資訊 → 取消方案；遠傳門號代收打 888 或 123 [S:friday-koc] | 隨遠傳門號送的免費期會轉付費 [S:friday-koc] |

PlayStation Plus、Amazon Prime Video（含台灣大哥大方案）的台灣取消路徑與退款規定未確認。`,
    },
    {
      title: '截止時間與常見陷阱',
      body: `- 截止時間：KKBOX 扣款前一天與當天不能取消 [S:kkbox-cancel]；LINE MUSIC 前一天 23:59 [S:line-music]；LINE 貼圖 48 小時或前一天 21:59 [S:line-sticker]；Apple 試用至少 24 小時前 [S:apple-subs]；LINE Premium 至少 24 小時前 [S:line-premium]。
- Apple 一般訂閱的續訂時刻沒有資料：請使用者在訂閱頁看續訂日並立刻取消；如果距離續訂已不到 24 小時，這一期可能仍會扣款（未確認）。
- **已經進入不能取消的時間**（例如 KKBOX 扣款前一天或當天）：直接告訴使用者這一期會扣款，請在扣款後隔天取消，就能擋住下一期 [S:kkbox-cancel]。不要叫他「趕快在今天取消」。
- 試用：Spotify 免費試用期間取消會立刻失去 Premium [S:spotify-faq]；試用結束就自動轉付費。
- 收錢的那一層取消才有效：在服務裡取消 Apple、Google、電信或 PayPal 收費的訂閱可能無效。
- 帳號不對：收據上是另一個 Apple 帳號、家人買的方案要由購買者取消。
- 取消後的資料：iCloud、Google One 超過容量會停備份與收信 [S:icloud-plan][S:google-one]。
- 有人用你的帳號重新開通：取消後可考慮改密碼並登出所有裝置。`,
    },
    {
      title: '台灣規定',
      body: `| 規定 | 內容 | 來源 |
| --- | --- | --- |
| 7 天解除權 | 通訊交易可在收到商品或接受服務後 7 天內解除，不用理由與費用；業者未告知時最長延到 4 個月 | [S:cpc-7day] |
| 數位內容例外 | 非以有形媒介提供、經消費者事先同意始提供的數位內容或一經提供即完成的線上服務，可不適用 7 天；業者須事先告知 | [S:moj-exception] |
| 退款期限 | 服務契約解除後，業者應於 15 天內退款 | [S:ey-refund] |
| 小額付費 | 電信小額付費預設關閉，開通需雙向簡訊確認（2014 年規定，之後是否修正未確認） | [S:ncc-mp] |
| 申訴 | 先向業者申訴（15 天內處理）→ 消費者保護官 → 調解；專線 1950，線上申訴 appeal.cpc.ey.gov.tw | [S:cpc-complaint] |
| 電信帳單上的代收款 | 電信只負責代收，內容爭議先找內容商，再走上面的申訴流程 | [S:cht-vas] |
| 信用卡爭議款 | 在當期繳款截止日前向發卡銀行提出並附理由與證明；失敗要連同利息繳 | [S:fsc-card] |
| 自動續訂新規 | 數位發展部修正草案：禁止預設同意自動續訂扣款、取消要和訂閱一樣容易；**仍是草案** | [S:taipeitimes-draft] |`,
    },
  ],
  report: `## 你的訂閱清單
| 服務 | 誰在收錢 | 下次扣款 | 取消截止 | 取消後會失去 |

## 取消步驟（逐一列出路徑）
## 取消後請確認（看到成功畫面或確認信才算；記下到期日並截圖）
## 退款可能性（依規定，不保證）
## 有爭議時怎麼做（商家 → 1950；刷卡付的走信用卡爭議款；電信代收先找內容商）
## 尚未確認的地方
## 來源與核對日`,
  openQuestions: [
    '串流與 App 訂閱是否屬於 7 天解除權的數位內容例外（沒有找到消保處解釋）。',
    '數位發展部自動續訂修正的最終條文、生效日，以及是否涵蓋國外串流與 App 訂閱。',
    'Netflix、Disney+、Spotify、ChatGPT、Microsoft、PlayStation、Nintendo 在台灣的退款條款；Adobe 提前解約費在台灣的條文。',
    'Amazon Prime Video 與台灣大哥大 Prime Video 方案的取消方式。',
    '電信加值服務的線上自助關閉頁面目前的選單位置。',
    'Apple、Google、YouTube、Google One 的台灣中文選單名稱（以上路徑來自官方英文說明的摘要）。',
  ],
  sources: [
    { id: 'apple-subs', title: 'Apple：取消訂閱', url: 'https://support.apple.com/en-us/118428', authority: 'Apple', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'apple-refund', title: 'Apple：申請退款', url: 'https://support.apple.com/en-us/118223', authority: 'Apple', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'google-subs', title: 'Google Play：取消、暫停或變更訂閱', url: 'https://support.google.com/googleplay/answer/7018481?hl=zh-Hant', authority: 'Google', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'google-refund', title: 'Google Play：退款', url: 'https://support.google.com/googleplay/answer/2479637?hl=zh-Hant', authority: 'Google', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'paypal-auto', title: 'PayPal：取消自動付款', url: 'https://www.paypal.com/tw/cshelp/article/help240', authority: 'PayPal', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'cht-vas', title: '中華電信：小額付款與加值服務', url: 'https://www.cht.com.tw/home/consumer/mobservice/value-added/701', authority: '中華電信', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'twm-mp', title: '台灣大哥大：小額付費', url: 'https://www.taiwanmobile.com/vas/mp/index.html', authority: '台灣大哥大', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'fet-pay', title: '遠傳：代收服務', url: 'https://www.fetnet.net/content/cbu/tw/digital-services/payment.html', authority: '遠傳電信', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'netflix-cancel', title: 'Netflix：如何取消', url: 'https://help.netflix.com/en/node/407', authority: 'Netflix', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'spotify-faq', title: 'Spotify 社群 FAQ：取消訂閱', url: 'https://community.spotify.com/t5/FAQs/Cancel-your-subscription/ta-p/1215075', authority: 'Spotify', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'youtube-cancel', title: 'YouTube：取消付費會員', url: 'https://support.google.com/youtube/answer/6308278?hl=zh-Hant', authority: 'Google', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'disney-terms', title: 'Disney+ 訂閱者協議（台灣）', url: 'https://www.disneyplus.com/en-tw/welcome/subscriber-agreement', authority: 'Disney+', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'icloud-plan', title: 'Apple：降級或取消 iCloud+', url: 'https://support.apple.com/en-us/108318', authority: 'Apple', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'google-one', title: 'Google One：取消會員資格', url: 'https://support.google.com/googleone/answer/9056360?hl=zh-Hant', authority: 'Google', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'openai-cancel', title: 'OpenAI：取消 ChatGPT Plus', url: 'https://help.openai.com/en/articles/7232927', authority: 'OpenAI', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'ms-billing', title: 'Microsoft：開啟或關閉定期付款', url: 'https://support.microsoft.com/en-us/accounts-billing/subscriptions/turn-recurring-billing-on-or-off-for-a-microsoft-subscription', authority: 'Microsoft', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'adobe-cancel', title: 'Adobe：取消訂閱', url: 'https://helpx.adobe.com/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html', authority: 'Adobe', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'kkbox-cancel', title: 'KKBOX：取消訂閱', url: 'https://help.kkbox.com/tw/zh-tw/billing/cancel-change/296', authority: 'KKBOX', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'line-music', title: 'LINE MUSIC：取消方案', url: 'https://help2.line.me/LINEMusicTW/web/categoryId/50003357/pc?lang=zh-Hant', authority: 'LINE', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'line-sticker', title: 'LINE：貼圖超值方案取消', url: 'https://help.line.me/line/?contentId=20013692&lang=zh-Hant', authority: 'LINE', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'line-premium', title: 'LINE Premium 服務條款（台灣 iOS）', url: 'https://terms.line.me/line_lnp_terms_tw_ios/sp?lang=zh-Hant&country=TW', authority: 'LINE', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'nownews-line', title: 'NOWnews：LINE Premium 取消與扣款', url: 'https://www.nownews.com/news/6812110', authority: 'NOWnews', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'friday-koc', title: 'friDay影音取消方式（第三方整理）', url: 'https://www.koc.com.tw/archives/632492', authority: '第三方網站', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'low' },
    { id: 'nintendo-tw', title: '任天堂：停止 Nintendo Switch Online 自動續訂', url: 'https://www.nintendo.tw/support/switch/qna_sub/35585.html', authority: '任天堂（台灣）', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'cpc-7day', title: '行政院消保會：網購 7 日解除權與合理例外', url: 'https://cpc.ey.gov.tw/Page/BC16ACF0BBB9CCC2/f8e15c56-0cbe-49ac-a7ba-2f41e1d9ca55', authority: '行政院消費者保護會', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'moj-exception', title: '通訊交易解除權合理例外情事適用準則 第 2 條', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0170012&flno=2', authority: '全國法規資料庫', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'ey-refund', title: '行政院：解除契約後 15 日內退款', url: 'https://www.ey.gov.tw/Page/8F51FEE53AB45EA9/ce357228-cfa1-4415-bb55-731207c82078', authority: '行政院', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'cpc-complaint', title: '行政院消保會：消費爭議申訴流程', url: 'https://cpc.ey.gov.tw/Page/71E988F034956960', authority: '行政院消費者保護會', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
    { id: 'fsc-card', title: '信用卡定型化契約範本（爭議款）', url: 'https://www.ey.gov.tw/File/AF101C0FFEDDC48C?A=C', authority: '金融監督管理委員會', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'ncc-mp', title: 'NCC：小額付費預設關閉', url: 'https://www.lawbank.com.tw/news/NewsContent.aspx?NID=117890', authority: '法源法律網（NCC 規定報導）', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'medium' },
    { id: 'taipeitimes-draft', title: 'Taipei Times：數位發展部自動續訂修正草案', url: 'https://www.taipeitimes.com/News/taiwan/archives/2026/08/25/2003863095', authority: 'Taipei Times', checkedAt: '2026-10-31', verification: 'search_extract', confidence: 'high' },
  ],
};
