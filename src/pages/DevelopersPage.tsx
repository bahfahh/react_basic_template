import { Bot, Globe, Server } from 'lucide-react';
import { JP_TICKET_OPTIMIZER } from '@/core';
import { useApi } from '@/api/ApiProvider';
import { Badge, Card, CardBody, CardHeader, Notice, PageHeader } from '@/components/ui';

const ENDPOINTS: Array<[string, string, string]> = [
  ['GET', '/api/packages?category=&q=', '搜尋 Task Package'],
  ['GET', '/api/packages/{id}', 'Package manifest（輸入、核准規則、相容性）'],
  ['GET', '/api/packages/{id}/skill.md', 'SKILL.md 匯出'],
  ['GET', '/api/offers?city=&q=', '票券、景點、票價與來源'],
  ['POST', '/api/compare', '無狀態比較（不建立任務）'],
  ['POST', '/api/tasks', '建立任務（支援 Idempotency-Key）'],
  ['GET', '/api/tasks/{id}', '任務狀態、比較結果、待核准動作'],
  ['GET', '/api/tasks/{id}/events', '事件時間軸'],
  ['POST', '/api/tasks/{id}/inputs', '補資料／選方案／修改預填內容'],
  ['POST', '/api/tasks/{id}/approvals/{actionId}', '核准或拒絕（需 payloadHash）'],
  ['POST', '/api/tasks/{id}/evidence', '上傳證明（只存中繼資料）'],
  ['POST', '/api/tasks/{id}/outcome-evidence', '回報結果'],
  ['POST', '/api/tasks/{id}/cancel', '取消任務'],
  ['POST', '/api/tasks/{id}/verify', '用保存的資料重算並比對雜湊'],
  ['GET', '/api/compatibility', '各 Package 的實測相容等級'],
];

const TOKENS: Array<[string, string, string]> = [
  ['lp_demo_user_alice', 'Alice 本人（網頁）', 'packages:read tasks:read tasks:write approvals:write'],
  ['lp_demo_agent_alice', 'Alice 的外部 Agent（MCP）', 'packages:read tasks:read tasks:write（不能核准）'],
  ['lp_demo_user_bob', 'Bob（測試跨租戶隔離）', '同 Alice，但看不到 Alice 的任務'],
  ['lp_demo_admin', '內部覆核', 'packages:read tasks:read admin'],
];

export function DevelopersPage() {
  const api = useApi();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        lazypack: {
          type: 'http',
          url: `${api.mode === 'http' ? origin.replace(':5173', ':8787') : 'http://localhost:8787'}/mcp`,
          headers: { Authorization: 'Bearer ${LAZYPACK_TOKEN}' },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="給 Agent 與開發者"
        title="同一個 Task API，網頁和 MCP 共用"
        description="自有 Task Package 是唯一事實來源。網頁、HTTP API 與 MCP Gateway 都呼叫同一個 TaskService，所以驗證、權限、核准規則不會因管道而不同。"
      />

      {api.mode === 'local' && (
        <Notice tone="warning" title="目前是瀏覽器示範模式">
          這個頁面沒有連到 API 伺服器。在本機執行 <code>npm run dev</code> 會同時啟動 API（:8787）與 MCP Gateway。
        </Notice>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { icon: Globe, title: 'Web App', body: '一般使用者直接使用；核准一律在這裡由本人完成。', level: 'L4' },
          { icon: Server, title: 'HTTP Task API', body: 'REST 介面，建立任務支援 Idempotency-Key。', level: 'L4' },
          { icon: Bot, title: 'MCP Gateway', body: '單一 Gateway、9 個穩定工具；不為每個 Package 開獨立 server。', level: 'L4（SDK client）' },
        ].map((x) => (
          <Card key={x.title}>
            <CardBody>
              <div className="flex items-center justify-between">
                <x.icon className="h-6 w-6 text-primary" aria-hidden />
                <Badge tone="success">{x.level}</Badge>
              </div>
              <p className="mt-3 font-bold">{x.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{x.body}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="MCP 工具" description="Streamable HTTP，無狀態模式；每個請求以呼叫者的 token 建立權限上下文。" />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {JP_TICKET_OPTIMIZER.mcpTools.map((t) => (
              <Badge key={t} tone="primary">
                {t}
              </Badge>
            ))}
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">MCP client 設定範例（token 放環境變數，不寫進 Skill 檔）</p>
            <pre className="overflow-auto rounded-xl bg-muted p-3 text-xs">{mcpConfig}</pre>
          </div>
          <Notice tone="info" title="外部 Agent 不能核准">
            Agent token 沒有 <code>approvals:write</code>。呼叫 <code>approve_action</code> 會收到 <code>approval_required_in_app</code> 與核准連結，由使用者在網頁確認後，Agent 再以 <code>get_task</code> 取回結果。
          </Notice>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="HTTP API" />
        <CardBody>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[520px] text-sm">
              <tbody className="divide-y">
                {ENDPOINTS.map(([m, p, d]) => (
                  <tr key={m + p}>
                    <td className="w-16 px-3 py-2">
                      <Badge tone={m === 'GET' ? 'info' : 'highlight'}>{m}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <pre className="mt-4 overflow-auto rounded-xl bg-muted p-3 text-xs">{`curl -X POST http://localhost:8787/api/tasks \\
  -H "Authorization: Bearer lp_demo_user_alice" \\
  -H "Idempotency-Key: my-key-0001" \\
  -H "Content-Type: application/json" \\
  -d '{"packageId":"travel.jp-ticket-optimizer","consents":{"privacy_processing":true},
       "input":{"travelDates":{"start":"2026-11-24","end":"2026-11-24"},
                "travelers":{"adults":2,"childAges":[]},"lodgingCity":"osaka",
                "days":[{"date":"2026-11-24","city":"osaka","attractions":["osaka_castle","umeda_sky","tombori_cruise"]}]}}'`}</pre>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="原型示範 token" description="正式版改用 OAuth/OIDC、最小權限 scope 與短效 token。" />
        <CardBody>
          <ul className="divide-y rounded-xl border text-sm">
            {TOKENS.map(([tok, who, scopes]) => (
              <li key={tok} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <code className="text-xs">{tok}</code>
                <span className="text-muted-foreground">
                  {who}・{scopes}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
