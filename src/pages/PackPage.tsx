import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react';
import { AREAS, bestVerdict, findPack, findPlanned, SOURCE_STATUS, sourceCheck, type Pack, type Verdict } from '@/packs';
import { AGENTS } from '@/app/agents';
import { packUrl } from '@/app/config';
import { newHandoffCode, saveHandoff } from '@/app/handoffs';
import { iconFor } from '@/app/icons';
import { Badge, Button, buttonClass, Card, CardBody, CardHeader, inputClass, Notice } from '@/components/ui';
import { copyText } from '@/lib/format';
import { cn } from '@/lib/utils';
import { VALUE_TONE } from './HomePage';
import { NotFoundPage } from './NotFoundPage';

export function PackPage() {
  const { id = '' } = useParams();
  const pack = findPack(id);
  if (pack) return <ActivePack pack={pack} />;
  const planned = findPlanned(id);
  if (!planned) return <NotFoundPage />;
  const Icon = iconFor(planned.icon);
  return (
    <div className="space-y-6">
      <BackLink />
      <Header icon={<Icon className="h-6 w-6" aria-hidden />} title={planned.title} subtitle={planned.short}>
        <Badge>規劃中</Badge>
        <Badge>{AREAS[planned.area].title}</Badge>
      </Header>
      <Notice tone="info" title="這個懶人包還在準備中">
        <p>還沒做的原因：{planned.blocker}</p>
      </Notice>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      全部懶人包
    </Link>
  );
}

function Header({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <header className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</span>
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>
      </div>
    </header>
  );
}

/** Short label for a step: its bold lead ("**看時間**：…"), the part before "：", or a clipped sentence. */
const stepTitle = (s: string) => {
  const plain = s.replace(/\[S:[\w-]+\]/g, '').trim();
  const bold = plain.match(/^\*\*(.+?)\*\*/);
  if (bold) return bold[1].trim();
  const text = plain.replace(/\*\*/g, '');
  const lead = text.split('：')[0].trim();
  if (lead.length < text.length && lead.length <= 24) return lead;
  const sentence = text.split(/[。；]/)[0].trim();
  return sentence.length <= 40 ? sentence : `${sentence.slice(0, 38)}…`;
};

function ActivePack({ pack }: { pack: Pack }) {
  const Icon = iconFor(pack.icon);
  const verdicts = pack.sources.map((s) => bestVerdict(sourceCheck(SOURCE_STATUS, pack.id, s)));
  const readable = verdicts.filter((v) => v === 'ok').length;
  return (
    <div className="space-y-6">
      <BackLink />
      <Header icon={<Icon className="h-6 w-6" aria-hidden />} title={pack.title} subtitle={pack.short}>
        {pack.value.map((v) => (
          <Badge key={v} tone={VALUE_TONE[v]}>
            {v}
          </Badge>
        ))}
        <Badge>{pack.stage ? `${AREAS[pack.area].title}・${pack.stage}` : AREAS[pack.area].title}</Badge>
        <Badge tone={SOURCE_STATUS.checkedAt ? (readable === pack.sources.length ? 'success' : 'warning') : 'neutral'}>
          {SOURCE_STATUS.checkedAt ? `來源 ${readable}/${pack.sources.length} 可直接讀取` : `${pack.sources.length} 個來源，尚未自動檢查`}
        </Badge>
      </Header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <HandoffCard pack={pack} />
        <div className="space-y-4">
          <ListCard title="會先問你" items={pack.ask.required} />
          <ListCard title="AI 會怎麼做" items={pack.steps.map(stepTitle)} ordered />
        </div>
        <SourcesCard pack={pack} verdicts={verdicts} />
        <PackUrlCard pack={pack} />
      </div>
    </div>
  );
}

function buildMessage(pack: Pack, notes: string, code: string): string {
  return [
    '請讀取這個懶人包，照裡面的步驟幫我處理：',
    packUrl(pack.id),
    '',
    `我的情況：${notes.trim() || '（請先問我需要的資料）'}`,
    `交辦編號：${code}`,
    '付款、登入、送出個資或預約之前，請先停下來問我。',
  ].join('\n');
}

function HandoffCard({ pack }: { pack: Pack }) {
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState(newHandoffCode);
  const [done, setDone] = useState<{ code: string; copied: boolean } | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const agent = AGENTS.find((a) => a.id === agentId)!;
  const message = useMemo(() => buildMessage(pack, notes, code), [pack, notes, code]);

  const record = (copied: boolean) => {
    saveHandoff({ id: code, code, packId: pack.id, packTitle: pack.title, agentName: agent.name, message, at: new Date().toISOString() });
    setDone({ code, copied });
  };

  return (
    <Card className="lg:row-span-2 lg:self-start">
      <CardHeader title="交給 AI" description="選你的 agent，把下面這段訊息交給它。AI 會讀取懶人包網址，照著步驟上網查、幫你比較。" />
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
            placeholder={pack.placeholder}
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

function ListCard({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <ul className="space-y-1.5 text-sm">
          {items.map((item, i) => (
            <li key={item} className="flex gap-2">
              {ordered ? (
                <span className="w-4 shrink-0 text-right font-semibold text-primary">{i + 1}</span>
              ) : (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              )}
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

const VERDICT_BADGE: Record<Verdict, { tone: 'success' | 'warning' | 'danger'; text: string }> = {
  ok: { tone: 'success', text: '可直接讀取' },
  no_text: { tone: 'warning', text: '可能要用瀏覽器' },
  blocked: { tone: 'warning', text: '擋自動讀取' },
  error: { tone: 'danger', text: '打不開' },
};

function SourcesCard({ pack, verdicts }: { pack: Pack; verdicts: Array<Verdict | null> }) {
  const day = SOURCE_STATUS.checkedAt?.slice(0, 10);
  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="AI 會即時查這些地方"
        description={
          day
            ? `懶人包不放價格和金額，AI 每次都到這些頁面查最新的。${day} 自動檢查過這些網址能不能讀。`
            : '懶人包不放價格和金額，AI 每次都到這些頁面查最新的。網址還沒有自動檢查過。'
        }
      />
      <CardBody>
        <ul className="divide-y">
          {pack.sources.map((s, i) => {
            const v = verdicts[i];
            return (
              <li key={s.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary hover:underline">
                    {s.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {s.owner}・查：{s.find.join('、')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {!s.official && <Badge>非官方</Badge>}
                  {v && <Badge tone={VERDICT_BADGE[v].tone}>{VERDICT_BADGE[v].text}</Badge>}
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function PackUrlCard({ pack }: { pack: Pack }) {
  const [copied, setCopied] = useState(false);
  const urls = [
    { label: '做事方法（AI 讀這個）', url: packUrl(pack.id, 'md') },
    { label: '同內容 JSON', url: packUrl(pack.id, 'json') },
  ];
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="懶人包網址" description="任何能上網的 AI 都可以直接讀這個網址，格式和 Claude 的 skill 類似：什麼時候用、先問什麼、去哪裡查、怎麼比較、怎麼回報。" />
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
