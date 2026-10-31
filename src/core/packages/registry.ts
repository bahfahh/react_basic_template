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
  title: '日本票券省錢助手（大阪・京都）',
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

export const PACKAGES: PackageManifest[] = [
  JP_TICKET_OPTIMIZER,
  planned('travel.flight-deal', '機票比價與訂票準備', 'travel-savings', '旅遊省錢', '比較同航線、票種、行李及退改條件的實際總價，準備訂票。', '即時價格與授權訂票 API；不承諾永遠最低價；停在付款前。'),
  planned('travel.hotel-deal', '住宿跨平台比價', 'travel-savings', '旅遊省錢', '同日期、房型、入住人數、取消政策下跨平台比價。', '稅費、會員價、取消條件不同；需標準化。'),
  planned('travel.multi-booking', '景點多站點預約', 'travel-savings', '旅遊省錢', '景點預約時段、排程衝突檢查、多站點預填。', 'CAPTCHA、庫存即時性、帳號及付款核准。'),
  planned('travel.jp-tax-refund', '日本退稅準備', 'travel-savings', '旅遊省錢', '新制退稅資格提醒、收據整理、出境程序與退款追蹤。', '海關實體確認必須由旅客完成；VJW 可操作性須實測。'),
  planned('finance.subscription-cancel', '訂閱取消助手', 'consumer', '消費省錢', '找取消路徑、提醒續費、協助取消及確認結果。', '帳號授權與服務條款；適合測試正常流程。'),
  planned('benefit.eligibility', '補助資格初判', 'benefit', '權益補助', '公開補助查詢、資格初判、文件清單、預填草稿。', '不保證核准；正式送件需明確授權。'),
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
