import { Bot, Cog, MonitorSmartphone, ShieldCheck, User } from 'lucide-react';
import type { TaskEvent } from '@/core';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { dateTimeZh } from '@/lib/format';

const ACTOR = {
  user: { icon: User, label: '你' },
  agent: { icon: Bot, label: '外部 Agent' },
  system: { icon: Cog, label: '系統' },
  executor: { icon: MonitorSmartphone, label: '執行器' },
  admin: { icon: ShieldCheck, label: '覆核人員' },
} as const;

export function Timeline({ events }: { events: TaskEvent[] }) {
  return (
    <Card>
      <CardHeader title="事件時間軸" description="每個狀態變更、核准與執行步驟都有紀錄；個資與密碼類資訊會先遮蔽。" />
      <CardBody>
        <ol className="relative space-y-4 border-l pl-5">
          {events.map((e) => {
            const a = ACTOR[e.actor];
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border bg-card">
                  <a.icon className="h-3 w-3 text-muted-foreground" aria-hidden />
                </span>
                <p className="text-sm">{e.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {dateTimeZh(e.at)} ・ {a.label} ・ {e.channel.toUpperCase()} ・ {e.type}
                </p>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
