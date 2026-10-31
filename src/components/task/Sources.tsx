import { useState } from 'react';
import { BadgeCheck, ExternalLink, RefreshCw } from 'lucide-react';
import type { ComparisonView, SourceSnapshot } from '@/core';
import { useApi } from '@/api/ApiProvider';
import { Badge, Button, Card, CardBody, CardHeader, Notice } from '@/components/ui';

const TYPE_LABEL = { official: '官方', partner: '合作商', third_party: '第三方' } as const;
const CONF_LABEL = { high: '可信度高', medium: '可信度中', low: '可信度低' } as const;

export function SourceRow({ s }: { s: SourceSnapshot }) {
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <a href={s.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-primary hover:underline">
          {s.source.title}
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
        </a>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {s.source.authority}
          {s.source.notes ? ` ・ ${s.source.notes}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1 sm:justify-end">
        <Badge tone={s.source.sourceType === 'official' ? 'primary' : 'neutral'}>{TYPE_LABEL[s.source.sourceType]}</Badge>
        <Badge tone={s.source.confidence === 'low' ? 'warning' : 'neutral'}>{CONF_LABEL[s.source.confidence]}</Badge>
        <Badge tone={s.freshness === 'fresh' ? 'success' : 'danger'}>
          {s.freshness === 'fresh' ? `核對於 ${s.source.checkedAt}` : s.source.status === 'needs_review' ? '需覆核' : `過期（${s.ageDays} 天）`}
        </Badge>
      </div>
    </li>
  );
}

export function SourcesAndMethod({ taskId, comparison }: { taskId: string; comparison: ComparisonView & { resultHash?: string } }) {
  const api = useApi();
  const [verify, setVerify] = useState<{ matches: boolean; recomputedHash: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const extracted = comparison.sources.some((s) => s.source.verification === 'search_extract');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="計算方法" description="所有金額由確定性程式計算；AI 不會猜價格。" />
        <CardBody>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {comparison.method.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ol>
          <div className="mt-4 grid gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground sm:grid-cols-2">
            <p>計算版本：{comparison.priceCalculationVersion}</p>
            <p>資料版本：{comparison.catalogVersion}</p>
            <p>查詢日（asOf）：{comparison.asOf}</p>
            <p className="truncate">結果雜湊：{comparison.resultHash?.slice(0, 16)}…</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setVerify(await api.verify(taskId));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              用保存的資料重算一次
            </Button>
            {verify && (
              <span className={verify.matches ? 'flex items-center gap-1 text-sm font-medium text-success' : 'text-sm font-medium text-danger'}>
                {verify.matches ? (
                  <>
                    <BadgeCheck className="h-4 w-4" aria-hidden />
                    重算結果一致（雜湊 {verify.recomputedHash.slice(0, 10)}…）
                  </>
                ) : (
                  '重算結果不一致，已記錄待覆核'
                )}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`資料來源（${comparison.sources.length}）`} description="價格以來源核對日期為準；過期或需覆核的來源不能當成即時可購買價。" />
        <CardBody className="space-y-3">
          {extracted && (
            <Notice tone="warning" title="原型資料尚未逐頁人工核對">
              這些數字在 2026-10-31 由搜尋結果摘錄整理（建置環境無法直接開啟官方網站）。用於真實使用者測試前，必須由人工逐一抽查官方頁面。
            </Notice>
          )}
          <ul className="divide-y rounded-xl border text-sm">
            {comparison.sources.map((s) => (
              <SourceRow key={s.source.id} s={s} />
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
