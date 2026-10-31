import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { clearHandoffs, loadHandoffs, type Handoff } from '@/app/handoffs';
import { Badge, Button, buttonClass, Card, CardBody } from '@/components/ui';
import { copyText, dateTimeZh } from '@/lib/format';

export function HandoffsPage() {
  const [items, setItems] = useState<Handoff[]>(loadHandoffs);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">我的交辦</h1>
          <p className="mt-1 text-sm text-muted-foreground">交給 AI 的懶人包記在這個瀏覽器裡。之後接上後端，這裡會顯示 AI 回報的進度與結果。</p>
        </div>
        {items.length > 0 &&
          (confirming ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">清除全部紀錄？</span>
              <Button size="sm" variant="danger" onClick={() => (clearHandoffs(), setItems([]), setConfirming(false))}>
                清除
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                取消
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              清除紀錄
            </Button>
          ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="font-semibold">還沒有交辦</p>
          <p className="mt-1 text-sm text-muted-foreground">選一個懶人包，交給你的 AI。</p>
          <Link to="/" className={`${buttonClass('primary')} mt-4`}>
            看懶人包
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <HandoffRow key={h.code} h={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function HandoffRow({ h }: { h: Handoff }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/p/${h.packId}`} className="font-bold hover:text-primary">
              {h.packTitle}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {h.code} ・ 交給 {h.agentName} ・ {dateTimeZh(h.at)}
            </p>
          </div>
          <Badge tone="primary">已交出・等 AI 回報（模擬）</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={async () => setCopied(await copyText(h.message, ref.current))}>
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? '已複製' : '再複製一次'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? '收起訊息' : '看訊息'}
          </Button>
        </div>
        {open && (
          <textarea ref={ref} readOnly rows={6} value={h.message} className="w-full resize-none rounded-xl bg-muted p-3 font-mono text-xs leading-relaxed" />
        )}
      </CardBody>
    </Card>
  );
}
