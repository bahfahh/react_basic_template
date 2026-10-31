import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Baby, CalendarDays, FlaskConical, Hotel, ListChecks, Minus, Plus, Sparkles, Users, Wand2 } from 'lucide-react';
import {
  CATALOG,
  CITY_LABEL,
  compareTickets,
  estimateRides,
  findScenario,
  indexCatalog,
  parseIntakeText,
  SCENARIOS,
  upcomingMonday,
  type CityId,
  type JpTicketInput,
  type ParseResult,
  type SimulationKnobs,
  type TimePreference,
  type TransitSystemId,
} from '@/core';
import { useApi } from '@/api/ApiProvider';
import type { ApiError } from '@/api/types';
import { Badge, Button, Card, CardBody, CardHeader, Field, inputClass, Notice, PageHeader } from '@/components/ui';
import { dateZh, newIdempotencyKey, yen } from '@/lib/format';
import { cn } from '@/lib/utils';

const index = indexCatalog(CATALOG);
const MAX_DAYS = 7;
const CITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'osaka', label: '大阪' },
  { value: 'kyoto', label: '京都' },
  { value: 'tokyo', label: '東京（不支援）' },
  { value: 'nara', label: '奈良（不支援）' },
];

interface DayState {
  city: string;
  attractions: string[];
  rides?: Partial<Record<TransitSystemId, number>>;
}

interface FormState {
  start: string;
  end: string;
  adults: number;
  childAges: number[];
  lodgingCity: CityId;
  days: Record<string, DayState>;
  preferredTimes: TimePreference;
  foreignPassport: boolean;
  simulation?: SimulationKnobs;
}

function datesBetween(start: string, end: string): string[] {
  if (!start || !end || end < start) return start ? [start] : [];
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < MAX_DAYS) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > end) break;
    out.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function fromInput(input: JpTicketInput): FormState {
  const days: Record<string, DayState> = {};
  for (const d of input.days ?? []) days[d.date] = { city: d.city, attractions: d.attractions, rides: d.rides };
  return {
    start: input.travelDates?.start ?? '',
    end: input.travelDates?.end ?? '',
    adults: input.travelers?.adults ?? 0,
    childAges: input.travelers?.childAges ?? [],
    lodgingCity: input.lodgingCity === 'kyoto' ? 'kyoto' : 'osaka',
    days,
    preferredTimes: input.preferredTimes ?? 'any',
    foreignPassport: input.discountEligibility?.foreignPassport ?? true,
    simulation: input.simulation,
  };
}

function toInput(f: FormState): JpTicketInput {
  const dates = datesBetween(f.start, f.end);
  const input: JpTicketInput = {
    lodgingCity: f.lodgingCity,
    preferredTimes: f.preferredTimes,
    discountEligibility: { foreignPassport: f.foreignPassport },
  };
  if (f.start && f.end) input.travelDates = { start: f.start, end: f.end };
  if (f.adults > 0 || f.childAges.length > 0) input.travelers = { adults: f.adults, childAges: f.childAges };
  const days = dates
    .map((date) => ({ date, ...(f.days[date] ?? { city: f.lodgingCity, attractions: [] }) }))
    .filter((d) => d.attractions.length > 0 || d.city !== f.lodgingCity || (d.rides && Object.values(d.rides).some((n) => (n ?? 0) > 0)))
    .map((d) => ({ date: d.date, city: d.city, attractions: d.attractions, ...(d.rides ? { rides: d.rides } : {}) }));
  if (days.length) input.days = days;
  if (f.simulation && Object.keys(f.simulation).length) input.simulation = f.simulation;
  return input;
}

const EMPTY: FormState = { start: '', end: '', adults: 2, childAges: [], lodgingCity: 'osaka', days: {}, preferredTimes: 'any', foreignPassport: true };

export function IntakePage() {
  const api = useApi();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editTaskId = params.get('task');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [today, setToday] = useState<string>(new Date().toISOString().slice(0, 10));
  const [idemKey] = useState(newIdempotencyKey);
  const [scenarioId, setScenarioId] = useState<string>('');

  useEffect(() => {
    void api.today().then(setToday);
    api.track('start_intake');
  }, [api]);

  useEffect(() => {
    const sid = params.get('scenario');
    if (sid) loadScenario(sid);
    if (editTaskId) {
      void api.getTask(editTaskId).then((t) => {
        setForm(fromInput(t.input));
        setConsent(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, editTaskId]);

  function loadScenario(id: string) {
    const s = findScenario(id);
    if (!s) return;
    setScenarioId(id);
    setForm({ ...EMPTY, ...fromInput(s.build(upcomingMonday(today))) });
    setParsed(null);
  }

  const dates = datesBetween(form.start, form.end);
  const input = useMemo(() => toInput(form), [form]);
  const preview = useMemo(() => compareTickets(input, CATALOG, today), [input, today]);

  const setDay = (date: string, patch: Partial<DayState>) =>
    setForm((f) => ({ ...f, days: { ...f.days, [date]: { ...(f.days[date] ?? { city: f.lodgingCity, attractions: [] }), ...patch } } }));

  const parse = () => {
    const r = parseIntakeText(text, CATALOG, today);
    setParsed(r);
    setScenarioId('');
    setForm((f) => ({ ...f, ...fromInput({ ...toInput(f), ...r.input, days: r.input.days ?? toInput(f).days }), simulation: undefined }));
  };

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const task = editTaskId
        ? await api.submitInput(editTaskId, { kind: 'update_input', input })
        : await api.createTask({ packageId: 'travel.jp-ticket-optimizer', input, consents: { privacy_processing: consent } }, idemKey);
      navigate(`/tasks/${task.id}`);
    } catch (e) {
      setError((e as ApiError).message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="日本票券省錢助手・大阪／京都"
        title={editTaskId ? '補充行程資料' : '告訴懶人包你的行程'}
        description="填日期、人數和每天想去的景點。懶人包會比較逐項單買、一日券／周遊卡與混搭組合；不確定的地方會直接問你，不會猜。"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" aria-hidden />
                  用一句話描述（可略過）
                </span>
              }
              description="原型用規則解析文字；正式版改用 AI 結構化輸出。結果都會填進下方表單讓你確認。"
            />
            <CardBody className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className={cn(inputClass, 'h-auto py-2')}
                placeholder="例：11/24-11/25 兩個大人一個 8 歲小孩住大阪，第一天去大阪城、梅田藍天大廈、道頓堀遊船，第二天去京都清水寺和伏見稻荷"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={parse} disabled={!text.trim()}>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  解析並填入
                </Button>
                <span className="text-xs text-muted-foreground">請不要輸入密碼、OTP、卡號或證件號碼。</span>
              </div>
              {parsed && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-success-soft p-3 text-sm">
                    <p className="font-semibold">我理解到</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {parsed.understood.length ? parsed.understood.map((u) => <li key={u}>{u}</li>) : <li>（沒有可確定的資訊）</li>}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-warning-soft p-3 text-sm">
                    <p className="font-semibold">需要你確認</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {parsed.questions.length ? parsed.questions.map((q) => <li key={q}>{q}</li>) : <li>看起來都齊了，請檢查下方表單。</li>}
                    </ul>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" aria-hidden />日期與旅客</span>} />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="出發日" htmlFor="start">
                <input
                  id="start"
                  type="date"
                  className={inputClass}
                  value={form.start}
                  min={today}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value, end: f.end && f.end >= e.target.value ? f.end : e.target.value }))}
                />
              </Field>
              <Field label="最後一天" htmlFor="end" hint={`一次最多比較 ${MAX_DAYS} 天`}>
                <input id="end" type="date" className={inputClass} value={form.end} min={form.start || today} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
              </Field>
              <Field label={<span className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden />大人（12 歲以上）</span>}>
                <Stepper value={form.adults} min={0} max={9} onChange={(adults) => setForm((f) => ({ ...f, adults }))} />
              </Field>
              <Field label={<span className="flex items-center gap-1.5"><Baby className="h-4 w-4" aria-hidden />兒童年齡（票價依年齡分級）</span>}>
                <div className="flex flex-wrap items-center gap-2">
                  {form.childAges.map((age, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-xl border bg-card px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        max={17}
                        value={age}
                        aria-label={`第 ${i + 1} 位兒童年齡`}
                        onChange={(e) => setForm((f) => ({ ...f, childAges: f.childAges.map((a, j) => (j === i ? Number(e.target.value) : a)) }))}
                        className="w-10 bg-transparent text-center text-sm outline-none"
                      />
                      <span className="text-xs text-muted-foreground">歲</span>
                      <button
                        className="ml-1 text-muted-foreground hover:text-danger"
                        aria-label="移除"
                        onClick={() => setForm((f) => ({ ...f, childAges: f.childAges.filter((_, j) => j !== i) }))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, childAges: [...f.childAges, 8] }))} disabled={form.childAges.length >= 8}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    加兒童
                  </Button>
                </div>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2"><Hotel className="h-4 w-4 text-primary" aria-hidden />住宿與每日行程</span>}
              description="交通段數依景點自動估算（同區景點視為步行），可以手動調整。"
            />
            <CardBody className="space-y-4">
              <Field label="住在哪個城市">
                <Segmented
                  value={form.lodgingCity}
                  options={[{ value: 'osaka', label: '大阪' }, { value: 'kyoto', label: '京都' }]}
                  onChange={(v) => setForm((f) => ({ ...f, lodgingCity: v as CityId }))}
                />
              </Field>
              {dates.length === 0 && <p className="text-sm text-muted-foreground">先選日期，這裡會出現每一天的行程卡片。</p>}
              {dates.map((date) => (
                <DayCard key={date} date={date} lodging={form.lodgingCity} day={form.days[date] ?? { city: form.lodgingCity, attractions: [] }} onChange={(p) => setDay(date, p)} />
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="偏好與資格" />
            <CardBody className="space-y-4">
              <Field label="景點時段偏好" hint="部分 Pass 的免費入場有時段限制（例如梅田藍天大廈 15:00 前）。">
                <Segmented
                  value={form.preferredTimes}
                  options={[{ value: 'any', label: '不限' }, { value: 'daytime', label: '白天' }, { value: 'evening', label: '晚上／夜景' }]}
                  onChange={(v) => setForm((f) => ({ ...f, preferredTimes: v as TimePreference }))}
                />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={form.foreignPassport}
                  onChange={(e) => setForm((f) => ({ ...f, foreignPassport: e.target.checked }))}
                />
                <span>
                  我持外國護照、以短期滯在身分入境日本
                  <span className="block text-xs text-muted-foreground">台灣護照觀光旅客通常符合。部分旅客限定票券需要這個資格。</span>
                </span>
              </label>
            </CardBody>
          </Card>

          <details className="rounded-2xl border bg-card p-5 shadow-card">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <FlaskConical className="h-4 w-4 text-primary" aria-hidden />
              示範情境與重播設定（僅原型）
            </summary>
            <div className="mt-4 space-y-4">
              <Field label="載入測試情境" hint="P0 驗收用的 14 組人工建立行程，日期自動換成兩週後的週一起算。">
                <select className={inputClass} value={scenarioId} onChange={(e) => loadScenario(e.target.value)}>
                  <option value="">選擇情境…</option>
                  {SCENARIOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}（{s.tests.join('、')}）
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                {(
                  [
                    ['captcha', '預填時遇到 CAPTCHA'],
                    ['soldOutAtCheckout', '結帳時售完'],
                    ['checkoutPriceDeltaJpy', '結帳金額 +¥400'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-xl border px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={!!form.simulation?.[key]}
                      onChange={(e) =>
                        setForm((f) => {
                          const sim = { ...f.simulation } as Record<string, unknown>;
                          if (e.target.checked) sim[key] = key === 'checkoutPriceDeltaJpy' ? 400 : true;
                          else delete sim[key];
                          return { ...f, simulation: sim as SimulationKnobs };
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" aria-hidden />需求摘要</span>} />
            <CardBody className="space-y-3 text-sm">
              <SummaryRow label="日期" value={form.start ? `${dateZh(form.start)} – ${dateZh(form.end || form.start)}（${dates.length} 天）` : '未填'} />
              <SummaryRow
                label="旅客"
                value={`大人 ${form.adults}${form.childAges.length ? `、兒童 ${form.childAges.map((a) => `${a} 歲`).join('、')}` : ''}`}
              />
              <SummaryRow label="住宿" value={CITY_LABEL[form.lodgingCity]} />
              <SummaryRow
                label="景點"
                value={dates.reduce((n, d) => n + (form.days[d]?.attractions.length ?? 0), 0) + ' 個'}
              />
              {form.simulation && Object.keys(form.simulation).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <Badge tone="info">含示範重播設定</Badge>
                </div>
              )}
              {preview.kind === 'needs_input' && (
                <Notice tone="warning" title="還缺這些資料">
                  <ul className="list-disc space-y-0.5 pl-4">
                    {preview.missing.map((m) => (
                      <li key={m.field + m.label}>
                        {m.label}：{m.hint}
                      </li>
                    ))}
                  </ul>
                </Notice>
              )}
              {preview.kind === 'ineligible' && <Notice tone="danger" title="不適用">{preview.reason}</Notice>}
              {preview.kind === 'ok' && <Notice tone="success" title="資料齊全">建立任務後會顯示三種方案的完整比較與來源。</Notice>}
              {!editTaskId && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>我同意懶人包為了比較票券處理以上資料。只保存比較所需欄位，可隨時取消任務；不會分享給第三方 Agent。</span>
                </label>
              )}
              {error && <Notice tone="danger">{error}</Notice>}
              <Button className="w-full" size="lg" disabled={busy || (!editTaskId && !consent)} onClick={submit}>
                {busy ? '建立中…' : editTaskId ? '更新並重新比較' : '建立任務並比較'}
              </Button>
              <p className="text-xs text-muted-foreground">資料不足也可以建立，任務會進入「待補件」並列出缺少的欄位。</p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-xl border bg-card">
      <button className="flex h-10 w-10 items-center justify-center disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="減少">
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="tabular w-10 text-center font-semibold" aria-live="polite">
        {value}
      </span>
      <button className="flex h-10 w-10 items-center justify-center disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="增加">
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-muted p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', value === o.value ? 'bg-card shadow-sm' : 'text-muted-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function priceHint(id: string): string {
  const a = index.attraction(id)!;
  if (a.admission === 'free') return '免費';
  if (a.dynamicPrice) return `${yen(a.dynamicPrice.adultMin)} 起`;
  const adult = Array.isArray(a.admission) ? a.admission[0].adult : null;
  return adult === null ? '價格未核實' : yen(adult);
}

function DayCard({ date, lodging, day, onChange }: { date: string; lodging: CityId; day: DayState; onChange: (p: Partial<DayState>) => void }) {
  const supported = day.city === 'osaka' || day.city === 'kyoto';
  const options = supported ? CATALOG.attractions.filter((a) => a.city === day.city) : [];
  const estimated = supported ? estimateRides(day.city as CityId, lodging, day.attractions, index) : {};
  const rides = day.rides ?? estimated;
  const [editRides, setEditRides] = useState(!!day.rides);
  const hasExplicitRides = !!day.rides;
  useEffect(() => setEditRides(hasExplicitRides), [hasExplicitRides]);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{dateZh(date)}</p>
        <select
          className={cn(inputClass, 'h-9 w-auto')}
          value={day.city}
          onChange={(e) => onChange({ city: e.target.value, attractions: [], rides: undefined })}
          aria-label={`${date} 城市`}
        >
          {CITY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {supported ? (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {options.map((a) => {
              const on = day.attractions.includes(a.id);
              return (
                <button
                  key={a.id}
                  aria-pressed={on}
                  onClick={() => onChange({ attractions: on ? day.attractions.filter((x) => x !== a.id) : [...day.attractions, a.id], rides: editRides ? day.rides : undefined })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50',
                  )}
                >
                  {a.name}
                  <span className={cn('ml-1 text-xs', on ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{priceHint(a.id)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span>交通：</span>
            {editRides
              ? CATALOG.transit
                  .filter((t) => t.city === day.city || t.city === 'kansai')
                  .map((t) => (
                    <label key={t.id} className="flex items-center gap-1">
                      {t.name}
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={rides[t.id] ?? 0}
                        onChange={(e) => onChange({ rides: { ...rides, [t.id]: Number(e.target.value) } })}
                        className="h-7 w-12 rounded-lg border bg-card px-1 text-center text-foreground"
                      />
                      段
                    </label>
                  ))
              : Object.entries(rides).length
                ? Object.entries(rides).map(([k, n]) => (
                    <span key={k}>
                      {index.transit(k as TransitSystemId).name} {n} 段
                    </span>
                  ))
                : <span>還沒選景點</span>}
            <button
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => {
                if (editRides) onChange({ rides: undefined });
                else onChange({ rides: { ...estimated } });
                setEditRides(!editRides);
              }}
            >
              {editRides ? '改回自動估算' : '手動調整'}
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-danger">此 Package 目前只支援大阪與京都，選這個城市會讓任務標記為「不適用」。</p>
      )}
    </div>
  );
}
