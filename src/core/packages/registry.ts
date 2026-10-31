/**
 * Task Package Registry — the single source of truth for what each package does,
 * which actions need approval, and where it has actually been verified to work.
 * MCP tools, the web app and the SKILL.md exporter all read from here.
 */

export type CompatibilityLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export const COMPATIBILITY_LEVELS: Record<CompatibilityLevel, { code: string; label: string; meaning: string }> = {
  L0: { code: 'not_verified', label: '未驗證', meaning: '尚未實測。' },
  L1: { code: 'exportable', label: '可匯出', meaning: '能匯出可讀取的 Skill／Manifest，未保證平台可安裝。' },
  L2: { code: 'installable', label: '可安裝', meaning: '使用者能依官方支援方式安裝。' },
  L3: { code: 'callable', label: '可呼叫', meaning: '平台 Agent 能在測試帳號成功呼叫 MCP 工具。' },
  L4: { code: 'end_to_end', label: '端到端', meaning: '可完成建立任務、查詢狀態、人工核准、回傳結果。' },
};

export interface CompatibilityEntry {
  platform: string;
  surface: string;
  level: CompatibilityLevel;
  testedAt?: string;
  evidence?: string;
  notes: string;
}

export interface PackageManifest {
  schemaVersion: '1.0';
  id: string;
  title: string;
  summary: string;
  version: string;
  status: 'active' | 'planned';
  category: string;
  categoryLabel: string;
  locale: 'zh-TW';
  jurisdictions: string[];
  maintainer: { name: string; contact: string };
  inputSchemaRef?: string;
  outputSchemaRef?: string;
  inputs?: { required: string[]; optional: string[] };
  outputs?: string[];
  capabilities: string[];
  requiredConsents: string[];
  externalActions: Record<string, 'user_approval_required' | 'unsupported'>;
  humanApproval: string[];
  prohibited: string[];
  successCriteria: string[];
  sourcePolicy: { requireOfficialPrimarySource: boolean; showLastVerifiedAt: boolean; freshnessDays?: number };
  scope: string[];
  limitations: string[];
  blockers?: string;
  agentCan?: string;
  compatibility: CompatibilityEntry[];
  changelog: Array<{ version: string; date: string; notes: string }>;
  mcpTools: string[];
}

const NOT_VERIFIED_PLATFORMS: CompatibilityEntry[] = [
  { platform: 'Claude', surface: 'Claude Code（CLI）', level: 'L0', notes: '尚未實測；不可由其他 Claude 產品推論。' },
  { platform: 'Claude', surface: 'Claude Duet', level: 'L0', notes: 'spec 列出之產品，尚未實測。' },
  { platform: 'Claude', surface: 'Claude Plugins / Connectors', level: 'L0', notes: '尚未實測遠端 MCP 安裝流程。' },
  { platform: 'OpenAI', surface: 'ChatGPT dot', level: 'L0', notes: 'spec 列出之產品，尚未實測。' },
  { platform: 'OpenAI', surface: 'ChatGPT Apps / Plugins', level: 'L0', notes: '尚未實測。' },
  { platform: 'xAI', surface: 'Grok Bot', level: 'L0', notes: 'spec 列出之產品，尚未實測。' },
  { platform: 'xAI', surface: 'Grok 開發工具', level: 'L0', notes: '尚未實測。' },
];

export const JP_TICKET_OPTIMIZER: PackageManifest = {
  schemaVersion: '1.0',
  id: 'travel.jp-ticket-optimizer',
  title: '大阪・京都交通票券省錢',
  summary: '比較交通單買、一日券／周遊卡與混搭組合，算出同等權益下的最低總價，附官方來源與查詢日期，並協助準備購買（停在付款前）。',
  version: '0.1.0',
  status: 'active',
  category: 'travel-savings',
  categoryLabel: '旅遊省錢',
  locale: 'zh-TW',
  jurisdictions: ['JP'],
  maintainer: { name: 'LazyPack Core Team', contact: 'packages@lazypack.example' },
  inputSchemaRef: 'schemas/jp-ticket-optimizer.input.json',
  outputSchemaRef: 'schemas/task-result.output.json',
  inputs: {
    required: ['travel_dates', 'travelers', 'destinations_or_attractions'],
    optional: ['origin', 'lodging_area', 'preferred_times', 'flexibility', 'discount_eligibility'],
  },
  outputs: [
    'comparable_options',
    'recommended_purchase_bundle',
    'itemized_total_cost',
    'savings_baseline_and_method',
    'source_urls_and_checked_at',
    'restrictions_and_uncertainties',
    'booking_handoff',
  ],
  capabilities: ['policy_research', 'deterministic_pricing', 'bundle_optimization', 'booking_prefill', 'status_tracking'],
  requiredConsents: ['privacy_processing', 'external_submission'],
  externalActions: {
    prefill_booking: 'user_approval_required',
    login_to_external_service: 'unsupported',
    submit_personal_information: 'unsupported',
    reserve_or_purchase: 'unsupported',
    make_payment: 'unsupported',
  },
  humanApproval: ['login_to_external_service', 'submit_personal_information', 'reserve_or_purchase', 'any_payment'],
  prohibited: ['bypass_captcha', 'store_plaintext_credentials', 'auto_pay_without_explicit_confirmation', 'claim_unverified_discounts'],
  successCriteria: ['comparison_with_sources_and_checked_at', 'verified_purchase_receipt_for_savings'],
  sourcePolicy: { requireOfficialPrimarySource: true, showLastVerifiedAt: true, freshnessDays: 60 },
  scope: ['大阪、京都（含大阪↔京都移動）', '1–7 天、最多 9 人', '收錄 7 種票券、18 個景點（每筆資料的核對方式與日期見來源頁）'],
  limitations: [
    '價格以來源核對日期為準，不是即時報價；過期來源不提供購買協助。',
    '交通段數以景點自動估算，實際票價依起訖站。',
    '不包含學生票、會員價、第三方通路折扣（未經核實的折扣一律不列入）。',
    '日期浮動票價（例如 USJ）只顯示區間，不納入比較。',
  ],
  compatibility: [
    {
      platform: 'LazyPack',
      surface: 'Web App（本原型）',
      level: 'L4',
      testedAt: '2026-10-31',
      evidence: 'tests/task-service.test.ts、手動走查',
      notes: '建立任務 → 比較 → 選方案 → 核准 → 模擬預填 → 上傳收據 → 驗證節省。',
    },
    {
      platform: 'LazyPack',
      surface: 'HTTP Task API',
      level: 'L4',
      testedAt: '2026-10-31',
      evidence: 'tests/gateway-parity.test.ts',
      notes: '與 MCP 共用同一個 TaskService 與權限檢查。',
    },
    {
      platform: 'MCP',
      surface: 'MCP TypeScript SDK client（Streamable HTTP，自動化測試）',
      level: 'L4',
      testedAt: '2026-10-31',
      evidence: 'tests/gateway-parity.test.ts、npm run mcp:smoke',
      notes: 'Agent token 無核准權限；核准由使用者在網頁完成後，Agent 以 get_task 取回結果。',
    },
    {
      platform: 'Skill',
      surface: '通用 SKILL.md 匯出',
      level: 'L1',
      testedAt: '2026-10-31',
      evidence: 'registry/travel.jp-ticket-optimizer/SKILL.md',
      notes: '僅代表可匯出，未保證任何平台可安裝。',
    },
    ...NOT_VERIFIED_PLATFORMS,
  ],
  changelog: [{ version: '0.1.0', date: '2026-10-31', notes: '首版原型：大阪／京都票券比較、核准綁定 payloadHash、MockExecutor。' }],
  mcpTools: [
    'search_packages',
    'get_package',
    'create_task',
    'get_task',
    'submit_task_input',
    'approve_action',
    'cancel_task',
    'search_travel_offers',
    'compare_ticket_bundles',
  ],
};

const planned = (
  id: string,
  title: string,
  category: string,
  categoryLabel: string,
  agentCan: string,
  blockers: string,
): PackageManifest => ({
  schemaVersion: '1.0',
  id,
  title,
  summary: agentCan,
  version: '0.0.0',
  status: 'planned',
  category,
  categoryLabel,
  locale: 'zh-TW',
  jurisdictions: id.startsWith('travel.jp') ? ['JP'] : ['TW'],
  maintainer: { name: 'LazyPack Core Team', contact: 'packages@lazypack.example' },
  capabilities: [],
  requiredConsents: ['privacy_processing', 'external_submission'],
  externalActions: {},
  humanApproval: ['login_to_external_service', 'submit_personal_information', 'reserve_or_purchase', 'any_payment'],
  prohibited: ['bypass_captcha', 'store_plaintext_credentials', 'auto_pay_without_explicit_confirmation'],
  successCriteria: [],
  sourcePolicy: { requireOfficialPrimarySource: true, showLastVerifiedAt: true },
  scope: [],
  limitations: ['尚未開發（不列 P0）。'],
  agentCan,
  blockers,
  compatibility: [],
  changelog: [],
  mcpTools: [],
});

const guide = (
  base: Pick<PackageManifest, 'id' | 'title' | 'summary' | 'category' | 'categoryLabel' | 'jurisdictions' | 'inputs' | 'outputs' | 'prohibited' | 'scope' | 'limitations'>,
): PackageManifest => ({
  schemaVersion: '1.0',
  version: '0.1.0',
  status: 'active',
  locale: 'zh-TW',
  maintainer: { name: 'LazyPack Core Team', contact: 'packages@lazypack.example' },
  capabilities: ['policy_research', 'checklist', 'status_tracking'],
  requiredConsents: ['privacy_processing'],
  externalActions: { submit_application: 'unsupported', make_payment: 'unsupported' },
  humanApproval: ['login_to_external_service', 'submit_personal_information', 'submit_application', 'any_payment'],
  successCriteria: ['answer_with_sources_and_checked_at'],
  sourcePolicy: { requireOfficialPrimarySource: true, showLastVerifiedAt: true, freshnessDays: 60 },
  compatibility: [
    { platform: 'Skill', surface: '懶人包網址（Markdown）', level: 'L1', testedAt: '2026-10-31', notes: '可公開讀取；尚未在任何 agent 平台實測。' },
    ...NOT_VERIFIED_PLATFORMS,
  ],
  changelog: [{ version: '0.1.0', date: '2026-10-31', notes: '首版：依 2026-10-31 查證的公開資料撰寫。' }],
  mcpTools: [],
  ...base,
});

export const JP_TAX_REFUND_PACKAGE = guide({
  id: 'travel.jp-tax-refund',
  title: '日本退稅新制助手（2026-11 起）',
  summary: '2026-11-01 起日本改成先付含稅價、出境時海關確認、之後才退稅。幫你判斷是否適用、整理購物與出境當天要做的事、算出期限。',
  category: 'travel-savings',
  categoryLabel: '旅遊省錢',
  jurisdictions: ['JP'],
  inputs: { required: ['purchase_dates', 'departure_airport', 'entry_status'], optional: ['stores_and_amounts', 'japanese_abroad'] },
  outputs: ['eligibility_check', 'shopping_checklist', 'deadlines', 'departure_day_plan', 'refund_options', 'open_questions_and_sources'],
  prohibited: ['guarantee_refund_amount', 'claim_confirmation_after_checkin', 'encourage_non_export_or_resale', 'collect_identity_numbers'],
  scope: ['2026-11-01 起在日本免稅店的購物', '短期滯在的外國旅客（台灣護照觀光客）'],
  limitations: ['不處理 2026-10-31 以前購物的舊制細節', '海關確認與領退稅只能由旅客本人完成', '各退稅業者的手續費與入帳時間未確認'],
});

export const TW_RENT_SUBSIDY_PACKAGE = guide({
  id: 'benefit.tw-rent-subsidy',
  title: '租金補貼初判助手（115 年度）',
  summary: '依公開的 115 年度中央擴大租金補貼規定，初步判斷你可能符合哪些條件、估算每月金額，並整理文件與申請步驟。',
  category: 'benefit',
  categoryLabel: '權益補助',
  jurisdictions: ['TW'],
  inputs: { required: ['rental_location', 'applicant_status', 'household', 'home_ownership', 'household_income', 'building_status', 'landlord_relation'], optional: ['marriage_children', 'special_status'] },
  outputs: ['eligibility_check', 'estimated_amount', 'documents', 'how_to_apply', 'after_approval_duties', 'open_questions_and_sources'],
  prohibited: ['guarantee_approval', 'assist_fraud', 'collect_identity_numbers', 'submit_on_behalf'],
  scope: ['中央 300 億租金補貼 115 年度（2026-12-31 17:00 前送件）'],
  limitations: ['只是初判，資格與金額以主管機關審核為準', '116 年度（2027）規定尚未確認', '地方加碼只舉台北市為例'],
});

export const SUBSCRIPTION_CANCEL_PACKAGE = guide({
  id: 'finance.subscription-cancel',
  title: '訂閱取消助手',
  summary: '找出正在扣款的訂閱，照官方路徑在下次扣款前取消，並說明退款與申訴管道。',
  category: 'consumer',
  categoryLabel: '消費省錢',
  jurisdictions: ['TW'],
  inputs: { required: ['services_to_cancel', 'billing_channel', 'next_charge_date'], optional: ['refund_wanted', 'plan_type'] },
  outputs: ['subscription_list', 'cancel_steps', 'deadlines', 'confirmation', 'refund_and_dispute', 'open_questions_and_sources'],
  prohibited: ['press_cancel_without_confirmation', 'collect_passwords_or_card', 'advise_stopping_card_payment', 'use_unofficial_phone_numbers'],
  scope: ['台灣常見的串流、雲端、軟體、遊戲訂閱與電信代收'],
  limitations: ['部分服務的台灣退款條款未確認', '數位發展部自動續訂新規仍是草案'],
});

export const JP_PAYMENT_PACKAGE = guide({
  id: 'travel.jp-payment',
  title: '日本付款不吃虧',
  summary: '刷卡選日圓、算清楚海外手續費、現金在哪換、IC 卡和信用卡感應怎麼選，在日本付錢不多花冤枉錢。',
  category: 'travel-savings',
  categoryLabel: '旅遊省錢',
  jurisdictions: ['JP', 'TW'],
  inputs: { required: ['trip_plan', 'cards_and_phone'], optional: ['ic_card', 'mobile_wallet', 'cash_amount'] },
  outputs: ['before_trip_checklist', 'at_checkout_rules', 'cash_plan', 'ic_card_choice', 'transit_payment', 'open_questions_and_sources'],
  prohibited: ['claim_card_cashback_unchecked', 'recommend_dcc', 'collect_passwords_or_card'],
  scope: ['台灣發行的信用卡、金融卡在日本的付款與提款', 'IC 卡、信用卡感應乘車、可跨境的台灣行動支付'],
  limitations: ['不比較各卡當期回饋活動', '日本 ATM 手續費與即時匯率未查證'],
});

export const JP_RAIL_PASS_PACKAGE = guide({
  id: 'travel.jp-rail-pass',
  title: 'JR Pass 划算嗎',
  summary: '依你的行程，比較全國 JR Pass、區域周遊券和單買（含早鳥票），算出最省的方案與損益兩平點。',
  category: 'travel-savings',
  categoryLabel: '旅遊省錢',
  jurisdictions: ['JP'],
  inputs: { required: ['rail_legs', 'travelers', 'entry_status', 'purchase_channel'], optional: ['flexibility', 'green_car'] },
  outputs: ['per_leg_fares', 'pass_comparison', 'break_even', 'purchase_notes', 'open_questions_and_sources'],
  prohibited: ['claim_nozomi_included', 'use_outdated_prices', 'claim_unverified_discounts'],
  scope: ['全國 JR Pass 與熱門區域周遊券（關西、北陸、東日本、九州、北海道）'],
  limitations: ['部分區段票價未查到，需使用者自行查詢', 'JR 官方網站舊價是否仍適用未確認'],
});

export const JP_AIRPORT_TRANSFER_PACKAGE = guide({
  id: 'travel.jp-airport-transfer',
  title: '機場進市區交通',
  summary: '成田、羽田、關西、中部、福岡、新千歲機場到市區，依目的地、時間、行李與人數選最省或最快的方式。',
  category: 'travel-savings',
  categoryLabel: '旅遊省時',
  jurisdictions: ['JP'],
  inputs: { required: ['airport_and_time', 'destination', 'party_and_luggage'], optional: ['priority', 'return_airport', 'payment_method'] },
  outputs: ['cheapest_option', 'fastest_option', 'how_to_buy', 'late_night_notes', 'open_questions_and_sources'],
  prohibited: ['use_outdated_prices', 'claim_exact_taxi_fare', 'claim_exact_last_train'],
  scope: ['成田、羽田、關西、中部、福岡、新千歲六個機場'],
  limitations: ['末班車時間未查證', '部分巴士與計程車價格未經官方確認'],
});

export const JP_TOKYO_TRANSIT_PACKAGE = guide({
  id: 'travel.jp-tokyo-transit',
  title: '東京交通票券省錢',
  summary: '依你在東京每天的行程，比較刷 IC 卡和東京地鐵 24／48／72 小時券、各種一日券，算出最省的組合。',
  category: 'travel-savings',
  categoryLabel: '旅遊省錢',
  jurisdictions: ['JP'],
  inputs: { required: ['daily_itinerary', 'travelers', 'entry_status'], optional: ['arrival_departure_times', 'other_lines'] },
  outputs: ['per_ride_fares', 'pass_comparison', 'not_covered', 'how_to_buy', 'open_questions_and_sources'],
  prohibited: ['use_outdated_prices', 'claim_pass_covers_jr', 'claim_unverified_discounts'],
  scope: ['東京 23 區內的 JR、東京 Metro、都營地鐵與百合海鷗號'],
  limitations: ['部分區段票價依距離級距估算', '景點門票只列常見的幾個'],
});

export const TRAVEL_INCONVENIENCE_CLAIM_PACKAGE = guide({
  id: 'travel.tw-travel-inconvenience-claim',
  title: '旅遊不便險理賠',
  summary: '班機延誤、取消、行李延誤或遺失、護照遺失時，用信用卡附加或另外買的旅遊不便險把錢拿回來：當下要拿的證明、可以花的錢、回國怎麼申請。',
  category: 'money-recovery',
  categoryLabel: '把錢拿回來',
  jurisdictions: ['TW', 'JP'],
  inputs: { required: ['incident', 'paying_card', 'claimants', 'delay_length', 'where_now'], optional: ['standalone_policy', 'airline_help', 'expenses'] },
  outputs: ['eligibility_check', 'do_now_at_airport', 'claimable_items', 'documents', 'how_to_submit', 'complaint_path', 'open_questions_and_sources'],
  prohibited: ['guarantee_claim_amount', 'confuse_travel_accident_insurance', 'collect_identity_numbers', 'submit_on_behalf'],
  scope: ['台灣信用卡附加旅遊不便險與另外購買的旅遊不便險', '去日本的航班與行李事故'],
  limitations: ['保額與條件依卡別、年度不同，以使用者的保險證為準', '日文收據是否需翻譯未確認'],
});

export const PACKAGES: PackageManifest[] = [
  JP_PAYMENT_PACKAGE,
  JP_RAIL_PASS_PACKAGE,
  JP_AIRPORT_TRANSFER_PACKAGE,
  JP_TOKYO_TRANSIT_PACKAGE,
  JP_TICKET_OPTIMIZER,
  JP_TAX_REFUND_PACKAGE,
  TRAVEL_INCONVENIENCE_CLAIM_PACKAGE,
  TW_RENT_SUBSIDY_PACKAGE,
  SUBSCRIPTION_CANCEL_PACKAGE,
  planned('travel.flight-deal', '機票比價與訂票準備', 'travel-savings', '旅遊省錢', '比較同航線、票種、行李及退改條件的實際總價，準備訂票。', '即時價格與授權訂票 API；不承諾永遠最低價；停在付款前。'),
  planned('travel.hotel-deal', '住宿跨平台比價', 'travel-savings', '旅遊省錢', '同日期、房型、入住人數、取消政策下跨平台比價。', '稅費、會員價、取消條件不同；需標準化。'),
  planned('travel.multi-booking', '景點多站點預約', 'travel-savings', '旅遊省錢', '景點預約時段、排程衝突檢查、多站點預填。', 'CAPTCHA、庫存即時性、帳號及付款核准。'),
  planned('travel.flight-claim', '航班異動索賠準備', 'money-recovery', '退款理賠', '航班索賠證據整理、資格初判、申請草稿。', '依賴真實事故與外部裁定；延後驗證。'),
];

export function findPackage(id: string): PackageManifest | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export function searchPackages(q?: string, category?: string): PackageManifest[] {
  const needle = q?.trim().toLowerCase();
  return PACKAGES.filter((p) => {
    if (category && p.category !== category) return false;
    if (!needle) return true;
    return [p.id, p.title, p.summary, p.categoryLabel].some((s) => s.toLowerCase().includes(needle));
  });
}
