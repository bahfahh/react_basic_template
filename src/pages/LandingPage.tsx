import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Calculator, FileSearch, HandCoins, KeyRound, ListChecks, MousePointerClick, ShieldCheck } from 'lucide-react';
import { CATALOG, compareTickets, PACKAGES, SCENARIOS, todayIso, upcomingMonday } from '@/core';
import { useApi } from '@/api/ApiProvider';
import { Badge, buttonClass, Card, CardBody } from '@/components/ui';
import { yen } from '@/lib/format';

const FEATURED = ['osaka-pass-wins', 'kyoto-light', 'osaka-two-days', 'family-mixed-ages', 'weekend-metro', 'usj-not-covered'];

export function LandingPage() {
  const api = useApi();
  useEffect(() => api.track('landing_view'), [api]);

  const examples = useMemo(() => {
    const today = todayIso();
    const monday = upcomingMonday(today);
    return FEATURED.map((id) => {
      const s = SCENARIOS.find((x) => x.id === id)!;
      const r = compareTickets(s.build(monday), CATALOG, today);
      return { s, r: r.kind === 'ok' ? r.result : null };
    });
  }, []);
  const hero = examples[0];

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-[1.1fr_1fr] lg:pt-8">
        <div>
          <Badge tone="primary">日本自由行・大阪／京都・第一個懶人包</Badge>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            周遊卡到底
            <br />
            <span className="text-primary">划不划算？</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            輸入日期、景點和人數。懶人包比較逐項單買、一日券與混搭組合，每一筆價格都附官方來源與核對日期；你同意後再帶你到官方頁面購買——付款前一定停下來。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/start" className={buttonClass('primary', 'lg')}>
              免費比較我的行程
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a href="#examples" className={buttonClass('outline', 'lg')}>
              看示範案例
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">不保證最低價。比較結果是估算，買了並上傳收據後才算「已驗證節省」。</p>
        </div>

        {hero.r && (
          <Card className="overflow-hidden">
            <div className="bg-primary px-5 py-4 text-primary-foreground">
              <p className="text-xs opacity-80">示範：{hero.s.title}</p>
              <p className="mt-1 text-sm">{hero.s.summary}</p>
            </div>
            <CardBody className="space-y-3">
              {hero.r.strategies.map((st) => (
                <div key={st.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm">
                    {st.title}
                    {st.id === hero.r!.recommendedStrategyId && <Badge tone="highlight">推薦</Badge>}
                  </span>
                  <span className={st.id === hero.r!.recommendedStrategyId ? 'tabular text-lg font-black' : 'tabular text-muted-foreground'}>
                    {st.feasible ? yen(st.total) : '—'}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-highlight-soft px-4 py-3">
                <span className="text-sm font-semibold">預估可省</span>
                <span className="tabular text-2xl font-black text-highlight">{yen(hero.r.estimatedSavings)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {hero.r.sources.length} 個來源・核對日 {hero.r.sources[0]?.source.checkedAt}・計算版本 {hero.r.priceCalculationVersion}
              </p>
            </CardBody>
          </Card>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="承諾">
        {[
          { icon: FileSearch, title: '每個價格都有出處', body: '標示官方／第三方來源與核對日期，過期資料不當成即時價格。' },
          { icon: Calculator, title: '程式算，不是 AI 猜', body: '確定性程式比較同等權益的組合，算式全部攤開給你看。' },
          { icon: ShieldCheck, title: '付款前一定停下', body: '預填前逐項請你核准；登入、OTP、付款都由你本人完成。' },
          { icon: KeyRound, title: '不碰密碼與卡號', body: '不收密碼、OTP、卡號；記錄中的個資會先遮蔽。' },
        ].map((f) => (
          <Card key={f.title}>
            <CardBody>
              <f.icon className="h-6 w-6 text-primary" aria-hidden />
              <p className="mt-3 font-bold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight">三分鐘完成</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { icon: ListChecks, title: '1. 說出行程', body: '一句話或逐日勾選景點，缺什麼懶人包會直接問。' },
            { icon: Calculator, title: '2. 看比較', body: '單買 vs Pass vs 混搭，附明細、限制、來源與計算方法。' },
            { icon: MousePointerClick, title: '3. 準備購買', body: '拿到購買清單與官方連結；要協助預填，就逐項核准。' },
          ].map((s) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="examples" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black tracking-tight">示範案例</h2>
            <p className="mt-1 text-sm text-muted-foreground">數字由同一個比較引擎即時算出。有時候答案是「不要買 Pass」。</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {examples.map(({ s, r }) => {
            const singles = r?.recommendedStrategyId === 'singles';
            return (
              <Card key={s.id} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col">
                  <div className="flex flex-wrap gap-1">
                    {s.tests.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                  <p className="mt-3 font-bold">{s.title}</p>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.summary}</p>
                  {r && (
                    <div className="mt-4 flex items-end justify-between gap-2 border-t pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{singles ? '結論' : '預估可省'}</p>
                        <p className={singles ? 'font-bold' : 'tabular text-xl font-black text-highlight'}>{singles ? '單買最省，不需 Pass' : yen(r.estimatedSavings)}</p>
                      </div>
                      <Link to={`/start?scenario=${s.id}`} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        試試看
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-muted p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">接下來的懶人包</h2>
            <p className="mt-1 text-sm text-muted-foreground">依任務成功率與需求決定順序，不事先承諾。</p>
          </div>
          <Link to="/marketplace" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            看懶人包市集
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.filter((p) => p.status === 'planned')
            .slice(0, 4)
            .map((p) => (
              <div key={p.id} className="rounded-2xl bg-card p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <HandCoins className="h-4 w-4 text-primary" aria-hidden />
                  {p.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{p.agentCan}</p>
              </div>
            ))}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          也可以從支援 MCP 的 AI Agent 使用同一套任務 API（相容性以實測等級標示）。
        </p>
      </section>
    </div>
  );
}
