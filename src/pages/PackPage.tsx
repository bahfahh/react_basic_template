import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react';
import { CATALOG, findPackage, type PackageManifest } from '@/core';
import { AGENTS } from '@/app/agents';
import { packUrl } from '@/app/config';
import { newHandoffCode, saveHandoff } from '@/app/handoffs';
import { LABELS, PACK_META } from '@/app/packMeta';
import { Badge, Button, buttonClass, Card, CardBody, CardHeader, inputClass, Notice } from '@/components/ui';
import { copyText } from '@/lib/format';
import { cn } from '@/lib/utils';
import { NotFoundPage } from './NotFoundPage';

const label = (k: string) => LABELS[k] ?? k;
const dataCheckedAt = [...new Set(CATALOG.sources.map((s) => s.checkedAt))].sort().at(-1);

export function PackPage() {
  const { id = '' } = useParams();
  const pkg = findPackage(id);
  if (!pkg) return <NotFoundPage />;
  const meta = PACK_META[pkg.id];
  const Icon = meta?.icon;
  const active = pkg.status === 'active';

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        全部懶人包
      </Link>

      <header className="flex items-start gap-4">
        {Icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{pkg.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{pkg.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone={active ? 'success' : 'neutral'}>{active ? '可以用' : '準備中'}</Badge>
            {active && <Badge>v{pkg.version}</Badge>}
            {active && dataCheckedAt && <Badge>資料核對 {dataCheckedAt}</Badge>}
          </div>
        </div>
      </header>

      {active ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <HandoffCard pkg={pkg} placeholder={meta?.placeholder} />
          <div className="space-y-4">
            <ListCard title="AI 會幫你做" items={pkg.outputs?.map(label) ?? []} />
            <ListCard
              title="會問你的資料"
              items={[...(pkg.inputs?.required.map((k) => `${label(k)}（必填）`) ?? []), ...(pkg.inputs?.optional.filter((k) => !['origin', 'flexibility'].includes(k)).map(label) ?? [])]}
            />
            <ListCard title="一定先問你" items={pkg.humanApproval.map(label)} />
            <ListCard title="絕對不做" items={pkg.prohibited.map(label)} />
          </div>
          <PackUrlCard pkg={pkg} />
        </div>
      ) : (
        <Notice tone="info" title="這個懶人包還在準備中">
          <p>{pkg.agentCan}</p>
          {pkg.blockers && <p className="mt-1 text-muted-foreground">要先解決：{pkg.blockers}</p>}
        </Notice>
      )}
    </div>
  );
}

function buildMessage(pkg: PackageManifest, notes: string, code: string): string {
  return [
    '請讀取這個懶人包，照裡面的步驟幫我處理：',
    packUrl(pkg.id),
    '',
    `我的情況：${notes.trim() || '（請先問我需要的資料）'}`,
    `交辦編號：${code}`,
    '付款、登入、送出個資或預約之前，請先停下來問我。',
  ].join('\n');
}

function HandoffCard({ pkg, placeholder }: { pkg: PackageManifest; placeholder?: string }) {
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState(newHandoffCode);
  const [done, setDone] = useState<{ code: string; copied: boolean } | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const agent = AGENTS.find((a) => a.id === agentId)!;
  const message = useMemo(() => buildMessage(pkg, notes, code), [pkg, notes, code]);

  const record = (copied: boolean) => {
    saveHandoff({ id: code, code, packId: pkg.id, packTitle: pkg.title, agentName: agent.name, message, at: new Date().toISOString() });
    setDone({ code, copied });
  };

  return (
    <Card className="lg:row-span-2 lg:self-start">
      <CardHeader title="交給 AI" description="選你的 agent，把下面這段訊息交給它。AI 會讀取懶人包網址，照著步驟接手。" />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="選擇 agent">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={agentId === a.id}
              onClick={() => setAgentId(a.id)}
              className={cn('rounded-xl border px-3 py-2 text-left transition-colors', agentId === a.id ? 'border-primary bg-primary-soft' : 'hover:bg-muted')}
            >
              <span className="block text-sm font-semibold">{a.name}</span>
              <span className="block text-xs text-muted-foreground">{a.company}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium">
            你的情況（選填）
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={placeholder}
            className={cn(inputClass, 'h-auto py-2')}
          />
          <p className="text-xs text-muted-foreground">不寫也可以，AI 會先問你。請不要寫密碼、OTP、卡號或證件號碼。</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="message" className="text-sm font-medium">
            要交給 {agent.name} 的訊息
          </label>
          <textarea id="message" ref={messageRef} readOnly rows={8} value={message} className={cn(inputClass, 'h-auto resize-none break-all bg-muted py-2 font-mono text-xs leading-relaxed')} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={async () => record(await copyText(message, messageRef.current))}>
            <Copy className="h-4 w-4" aria-hidden />
            複製訊息
          </Button>
          {agent.openUrl && (
            <a
              href={agent.openUrl(message)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => record(false)}
              className={buttonClass('outline')}
            >
              {agent.openLabel}
              <ExternalLink className="h-4 w-4" aria-hidden />
              <Badge>模擬</Badge>
            </a>
          )}
        </div>

        {done && (
          <Notice tone="success" title={done.copied ? `已複製，交辦編號 ${done.code}` : `已記錄交辦 ${done.code}`}>
            <p>
              已加到
              <Link to="/handoffs" className="mx-1 font-semibold text-primary hover:underline">
                我的交辦
              </Link>
              。{done.copied ? `把訊息貼給 ${agent.name} 就可以了。` : '如果新分頁沒有帶入訊息，請改用複製。'}
            </p>
            <button className="mt-2 text-sm font-medium text-primary hover:underline" onClick={() => (setCode(newHandoffCode()), setDone(null))}>
              再交辦一次（新編號）
            </button>
          </Notice>
        )}

        <p className="text-xs text-muted-foreground">
          「開啟」連結是模擬的：會開啟該服務並帶入訊息，但能不能直接交給 {agent.id === 'other' ? 'agent' : agent.name} 還沒實測。最穩的做法是複製訊息，貼給你的 agent。
        </p>
      </CardBody>
    </Card>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <ul className="space-y-1.5 text-sm">
          {items.map((i) => (
            <li key={i} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {i}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function PackUrlCard({ pkg }: { pkg: PackageManifest }) {
  const [copied, setCopied] = useState(false);
  const urls = [
    { label: '任務說明（AI 讀這個）', url: packUrl(pkg.id, 'md') },
    { label: '資料（JSON）', url: packUrl(pkg.id, 'json') },
  ];
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="懶人包網址" description="任何能上網的 AI 都可以直接讀這個網址：裡面有步驟、規則、票價資料與來源。" />
      <CardBody className="space-y-2">
        {urls.map((u, i) => (
          <div key={u.url} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">{u.label}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{u.url}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {i === 0 && (
                <Button variant="ghost" size="sm" onClick={async () => setCopied(await copyText(u.url))}>
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? '已複製' : '複製'}
                </Button>
              )}
              <a href={u.url} target="_blank" rel="noopener noreferrer" className={buttonClass('ghost', 'sm')}>
                打開
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
