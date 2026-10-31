import { COMPATIBILITY_LEVELS, type CompatibilityEntry } from '@/core';
import { Badge } from '@/components/ui';

const TONE = { L0: 'neutral', L1: 'info', L2: 'info', L3: 'primary', L4: 'success' } as const;

export function CompatTable({ rows }: { rows: CompatibilityEntry[] }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">平台／環境</th>
              <th className="px-3 py-2 font-medium">實測等級</th>
              <th className="px-3 py-2 font-medium">測試日</th>
              <th className="px-3 py-2 font-medium">說明</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.surface}>
                <td className="px-3 py-2">
                  <p className="font-medium">{r.surface}</p>
                  <p className="text-xs text-muted-foreground">{r.platform}</p>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={TONE[r.level]}>
                    {r.level} {COMPATIBILITY_LEVELS[r.level].label}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.testedAt ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.notes}
                  {r.evidence && <span className="mt-0.5 block">證據：{r.evidence}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        等級定義：
        {Object.entries(COMPATIBILITY_LEVELS)
          .map(([k, v]) => `${k} ${v.code}＝${v.meaning}`)
          .join('　')}
        只顯示實測結果，不以品牌推論相容。
      </p>
    </div>
  );
}
