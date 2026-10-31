import { BedDouble, CalendarCheck, CreditCard, FileWarning, Landmark, Plane, Receipt, Ticket, type LucideIcon } from 'lucide-react';

/** Presentation-only details for each pack; the pack itself lives in the core registry. */
export const PACK_META: Record<string, { icon: LucideIcon; short: string; placeholder?: string }> = {
  'travel.jp-ticket-optimizer': {
    icon: Ticket,
    short: '大阪、京都的交通和景點，單買、一日券還是周遊卡最省？',
    placeholder: '例：11/24 兩個大人住大阪，想去大阪城、梅田藍天大廈、道頓堀遊船',
  },
  'travel.flight-deal': { icon: Plane, short: '同航線、行李、退改條件下比實際總價。' },
  'travel.hotel-deal': { icon: BedDouble, short: '同日期、房型、取消政策下跨平台比價。' },
  'travel.multi-booking': { icon: CalendarCheck, short: '多個景點預約時段，一次排好不衝突。' },
  'travel.jp-tax-refund': { icon: Receipt, short: '日本退稅資格提醒、收據整理到出境。' },
  'finance.subscription-cancel': { icon: CreditCard, short: '找到取消路徑，提醒續費日期。' },
  'benefit.eligibility': { icon: Landmark, short: '公開補助資格初判與文件清單。' },
  'travel.flight-claim': { icon: FileWarning, short: '航班異動的證據整理與申請草稿。' },
};

export const LABELS: Record<string, string> = {
  travel_dates: '旅遊日期',
  travelers: '人數與兒童年齡',
  destinations_or_attractions: '每天的城市與景點',
  origin: '出發地',
  lodging_area: '住宿城市',
  preferred_times: '白天或晚上去',
  flexibility: '日期能不能調',
  discount_eligibility: '是否持外國護照',
  comparable_options: '比較單買、Pass、混搭三種買法',
  recommended_purchase_bundle: '推薦要買哪些票',
  itemized_total_cost: '每天、每人的明細與總價',
  savings_baseline_and_method: '省多少、怎麼算的',
  source_urls_and_checked_at: '每個價格的來源與核對日',
  restrictions_and_uncertainties: '限制與不確定的地方',
  booking_handoff: '購買步驟與官方連結',
  login_to_external_service: '登入外部網站',
  submit_personal_information: '送出個人資料',
  reserve_or_purchase: '預約或購買',
  any_payment: '任何付款',
  bypass_captcha: '繞過 CAPTCHA',
  store_plaintext_credentials: '保存你的帳號密碼',
  auto_pay_without_explicit_confirmation: '沒經你確認就付款',
  claim_unverified_discounts: '宣稱沒核實過的優惠',
};
