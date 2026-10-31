import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useApi } from '@/api/ApiProvider';
import { useAsync } from '@/api/useAsync';
import { Badge, Button, Card, CardBody, CardHeader, Notice, PageHeader, Spinner, Stat, Tabs } from '@/components/ui';
import { SourceRow } from '@/components/task/Sources';
import { StatusBadge } from '@/components/task/Status';
import { dateTimeZh, twd, yen } from '@/lib/format';

type Tab = 'cases' | 'sources' | 'failures' | 'funnel' | 'cost' | 'audit';

const FUNNEL = [
  ['landing_view', '首頁瀏覽'],
  ['start_intake', '開始填寫'],
  ['qualified_case', '有效案件'],
  ['eligibility_view', '看比較結果'],
  ['plan_view', '看購買方案'],
  ['approve_plan', '核准動作'],
  ['payment_intent', '付費意向'],
  ['submission_verified', '交接完成'],
  ['upload_evidence', '上傳證明'],
  ['outcome_verified', '節省已驗證'],
] as const;

export function AdminPage() {
  const api = useApi();
  const { data, reload, loading } = useAsync(() => api.adminOverview(), []);
  const [tab, setTab] = useState<Tab>('cases');
  const [busy, setBusy] = useState<string>();
  if (!data) return <Spinner />;

  const reverify = async (id: string) => {
    setBusy(id);
    try {
      await api.reverifySource(id);
      await reload();
    } finally {
      setBusy(undefined);
    }
  };
  const maxFunnel = Math.max(1, ...FUNNEL.map(([k]) => data.funnel[k] ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="內部"
        title="覆核與營運"
        description="案件覆核、政策來源管理、失敗原因、漏斗、成本與稽核。原型以 admin token 檢視所有使用者的任務。"
        action={
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            重新整理
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardBody><Stat label="任務數" value={data.tasks.length} /></CardBody></Card>
        <Card><CardBody><Stat label="已驗證節省（Verified Savings）" value={yen(data.savings.verifiedSavingsJpy)} tone="success" sub={`${data.savings.verifiedTasks} 件有收據`} /></CardBody></Card>
        <Card><CardBody><Stat label="僅估算（不計入）" value={yen(data.savings.estimatedOnlyJpy)} sub="購買前估算或未驗證" /></CardBody></Card>
        <Card><CardBody><Stat label="每案成本 p50／p95" value={`${twd(data.costSummary.p50)}／${twd(data.costSummary.p95)}`} sub="模擬值" /></CardBody></Card>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'cases', label: '案件' },
          { value: 'sources', label: '政策來源' },
          { value: 'failures', label: '失敗原因' },
          { value: 'funnel', label: '漏斗' },
          { value: 'cost', label: '成本' },
          { value: 'audit', label: '稽核' },
        ]}
      />

      {tab === 'cases' && (
        <Card>
          <CardBody className="p-0">
            {data.tasks.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">還沒有任務。</p>
            ) : (
              <ul className="divide-y">
                {data.tasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <Link to={`/tasks/${t.id}`} className="font-medium hover:text-primary hover:underline">
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {t.userId} ・ {t.channel.toUpperCase()} ・ {dateTimeZh(t.createdAt)}
                        {t.statusReason ? ` ・ ${t.statusReason}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={t.status} sub={t.completionSubstate} />
                    {t.status === 'blocked' && t.comparison && (
                      <div className="w-full rounded-xl bg-danger-soft p-3 text-xs">
                        {t.comparison.warnings
                          .filter((w) => w.severity === 'block')
                          .map((w, i) => (
                            <p key={i}>{w.message}</p>
                          ))}
                        <Button
                          size="sm"
                          className="mt-2"
                          disabled={!!busy}
                          onClick={async () => {
                            const ids = [...new Set(t.comparison!.warnings.filter((w) => w.severity === 'block').flatMap((w) => w.refIds ?? []))];
                            setBusy(t.id);
                            try {
                              for (const id of ids) await api.reverifySource(id);
                              await reload();
                            } finally {
                              setBusy(undefined);
                            }
                          }}
                        >
                          已人工核對這些來源，解除阻擋
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'sources' && (
        <Card>
          <CardHeader title="政策／票價來源" description="過期或標記需覆核的來源會阻擋購買協助。重新核對後，受影響的任務會自動重新比較。" />
          <CardBody className="space-y-3">
            <Notice tone="warning">原型中的「標記已核對」只是示範操作；正式版必須附上人工核對紀錄（截圖、日期、核對者）。</Notice>
            <ul className="divide-y rounded-xl border text-sm">
              {data.sources.map((s) => (
                <div key={s.source.id} className="flex flex-col sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <SourceRow s={s} />
                  </div>
                  <div className="px-4 pb-3 sm:pb-0">
                    <Button size="sm" variant={s.freshness === 'stale' ? 'primary' : 'ghost'} disabled={busy === s.source.id} onClick={() => reverify(s.source.id)}>
                      標記已核對
                    </Button>
                    {s.override && <p className="mt-1 text-[11px] text-muted-foreground">由 {s.override.by} 於 {s.override.checkedAt}</p>}
                  </div>
                </div>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {tab === 'failures' && (
        <Card>
          <CardHeader title="失敗與中斷原因" />
          <CardBody>
            {Object.keys(data.failures).length === 0 ? (
              <p className="text-sm text-muted-foreground">沒有失敗紀錄。</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {Object.entries(data.failures)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2">
                      <span>{k}</span>
                      <Badge tone="danger">{v}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'funnel' && (
        <Card>
          <CardHeader title="漏斗事件（spec §7.3）" />
          <CardBody className="space-y-2">
            {FUNNEL.map(([k, label]) => {
              const n = data.funnel[k] ?? 0;
              return (
                <div key={k} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(n / maxFunnel) * 100}%` }} />
                  </div>
                  <span className="tabular text-right font-semibold">{n}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      {tab === 'cost' && (
        <Card>
          <CardHeader title="成本帳（模擬）" description="不能只用 token 估算 Computer Use 成本；原型分列 LLM、瀏覽器執行、來源查詢、計算與人工覆核。" />
          <CardBody>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">類別</th>
                    <th className="px-3 py-2 font-medium">說明</th>
                    <th className="px-3 py-2 font-medium">用量</th>
                    <th className="px-3 py-2 text-right font-medium">成本</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.costs.slice(-60).reverse().map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2"><Badge>{c.category}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">{c.description}</td>
                      <td className="tabular px-3 py-2">{c.units} {c.unit}</td>
                      <td className="tabular px-3 py-2 text-right">{twd(c.costTwd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader title="稽核紀錄（最近 200 筆）" description="訊息與資料在寫入前已遮蔽 OTP、卡號、證件號、email、電話。" />
          <CardBody>
            <ul className="divide-y text-sm">
              {data.events.map((e) => (
                <li key={e.id} className="py-2">
                  <p>{e.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTimeZh(e.at)} ・ {e.actor} ・ {e.channel} ・ {e.type} ・ {e.taskId}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
