import { Link, useParams } from 'react-router-dom';
import { Download, Hand, ShieldBan, Wrench } from 'lucide-react';
import { useApi } from '@/api/ApiProvider';
import { useAsync } from '@/api/useAsync';
import { Badge, buttonClass, Card, CardBody, CardHeader, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { CompatTable } from './CompatTable';

const LABELS: Record<string, string> = {
  travel_dates: '旅遊日期',
  travelers: '旅客人數與年齡',
  destinations_or_attractions: '目的地／景點',
  origin: '出發地',
  lodging_area: '住宿區域',
  preferred_times: '時段偏好',
  flexibility: '日期彈性',
  discount_eligibility: '優惠資格',
  comparable_options: '可比較方案',
  recommended_purchase_bundle: '推薦購買組合',
  itemized_total_cost: '分項總價',
  savings_baseline_and_method: '節省基準與算法',
  source_urls_and_checked_at: '來源與查詢時間',
  restrictions_and_uncertainties: '限制與不確定性',
  booking_handoff: '購買交接',
  login_to_external_service: '登入外部服務',
  submit_personal_information: '送出個人資料',
  reserve_or_purchase: '預約或購買',
  any_payment: '任何付款',
  bypass_captcha: '繞過 CAPTCHA',
  store_plaintext_credentials: '保存明文帳密',
  auto_pay_without_explicit_confirmation: '未經明確確認自動付款',
  claim_unverified_discounts: '宣稱未經核實的優惠',
  prefill_booking: '預填購買頁',
  make_payment: '付款',
};
const t = (k: string) => LABELS[k] ?? k;

export function PackagePage() {
  const { id = '' } = useParams();
  const api = useApi();
  const { data: pkg, error } = useAsync(() => api.getPackage(id), [id]);
  const { data: skill } = useAsync(() => api.skillMd(id).catch(() => ''), [id]);
  if (error) return <EmptyState title="找不到這個 Package" />;
  if (!pkg) return <Spinner />;

  const manifest = {
    schemaVersion: pkg.schemaVersion,
    id: pkg.id,
    title: pkg.title,
    version: pkg.version,
    category: pkg.category,
    locale: pkg.locale,
    jurisdictions: pkg.jurisdictions,
    inputSchemaRef: pkg.inputSchemaRef,
    outputSchemaRef: pkg.outputSchemaRef,
    capabilities: pkg.capabilities,
    requiredConsents: pkg.requiredConsents,
    externalActions: pkg.externalActions,
    successCriteria: pkg.successCriteria,
    sourcePolicy: pkg.sourcePolicy,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<code>{pkg.id}</code>}
        title={pkg.title}
        description={pkg.summary}
        action={
          pkg.status === 'active' ? (
            <Link to="/start" className={buttonClass('primary')}>
              用這個懶人包
            </Link>
          ) : (
            <Badge>規劃中</Badge>
          )
        }
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge tone="primary">v{pkg.version}</Badge>
        <Badge>{pkg.categoryLabel}</Badge>
        <Badge>維護者：{pkg.maintainer.name}</Badge>
        <Badge>語系 {pkg.locale}</Badge>
        <Badge>適用 {pkg.jurisdictions.join('、')}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="適用範圍與限制" />
          <CardBody className="space-y-3 text-sm">
            <ul className="list-disc space-y-1 pl-5">
              {pkg.scope.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {pkg.limitations.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="輸入與輸出" />
          <CardBody className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {pkg.inputs?.required.map((k) => <Badge key={k} tone="primary">必填・{t(k)}</Badge>)}
              {pkg.inputs?.optional.map((k) => <Badge key={k}>選填・{t(k)}</Badge>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pkg.outputs?.map((k) => <Badge key={k} tone="success">{t(k)}</Badge>)}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Hand className="h-4 w-4 text-highlight" aria-hidden />必須由你核准或親自完成</span>} />
          <CardBody className="space-y-2 text-sm">
            {Object.entries(pkg.externalActions).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <span>{t(k)}</span>
                <Badge tone={v === 'unsupported' ? 'neutral' : 'highlight'}>{v === 'unsupported' ? '懶人包不做（由你本人）' : '需逐次核准'}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><ShieldBan className="h-4 w-4 text-danger" aria-hidden />絕對不做</span>} />
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {pkg.prohibited.map((k) => (
                <Badge key={k} tone="danger">
                  {t(k)}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="跨 Agent 相容性（實測等級）" description="同一個 Task Package 可經網頁、HTTP API 與 MCP 使用；其他平台逐一實測後才會升級。" />
        <CardBody>
          <CompatTable rows={pkg.compatibility} />
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" aria-hidden />Manifest</span>} description={`MCP 工具：${pkg.mcpTools.join('、')}`} />
          <CardBody>
            <pre className="max-h-96 overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(manifest, null, 2)}</pre>
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="SKILL.md 匯出（L1）"
            description="通用技能說明，不含任何金鑰。"
            action={
              skill ? (
                <a
                  className={buttonClass('outline', 'sm')}
                  href={`data:text/markdown;charset=utf-8,${encodeURIComponent(skill)}`}
                  download={`${pkg.id}.SKILL.md`}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  下載
                </a>
              ) : undefined
            }
          />
          <CardBody>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs">{skill || '（規劃中的 Package 尚無匯出）'}</pre>
          </CardBody>
        </Card>
      </div>

      {pkg.changelog.length > 0 && (
        <Card>
          <CardHeader title="變更紀錄" />
          <CardBody className="space-y-1 text-sm">
            {pkg.changelog.map((c) => (
              <p key={c.version}>
                <span className="font-semibold">v{c.version}</span>（{c.date}）{c.notes}
              </p>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
