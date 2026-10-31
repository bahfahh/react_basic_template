import { NavLink, Link, Outlet } from 'react-router-dom';
import { Boxes, ClipboardList, Code2, Search, ShieldCheck } from 'lucide-react';
import { useApi } from '@/api/ApiProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/start', label: '開始比較', icon: Search },
  { to: '/tasks', label: '我的任務', icon: ClipboardList },
  { to: '/marketplace', label: '懶人包市集', icon: Boxes },
  { to: '/developers', label: 'API／MCP', icon: Code2 },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2', className)} aria-label="懶人包 LazyPack 首頁">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
      <span className="leading-none">
        <span className="block text-lg font-black tracking-tight">懶人包</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">LazyPack</span>
      </span>
    </Link>
  );
}

export function AppShell() {
  const api = useApi();
  return (
    <div className="flex min-h-screen flex-col">
      {api.mode === 'local' && (
        <div className="bg-highlight-soft px-4 py-1.5 text-center text-xs text-foreground/80">
          示範模式：沒有連到 API 伺服器，任務只保存在這個瀏覽器。
          {api.resetDemo && (
            <button className="ml-2 underline underline-offset-2" onClick={api.resetDemo}>
              清除示範資料
            </button>
          )}
        </div>
      )}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Logo />
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="主要導覽">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:pb-16">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 pb-28 text-xs text-muted-foreground md:grid-cols-3 md:pb-8">
          <div>
            <Logo />
            <p className="mt-3">把比較、查優惠、填資料的麻煩事交給懶人包。你看得到每一筆計算，付款永遠由你自己完成。</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">原型聲明</p>
            <p>不保證最低價、不保證可購買。價格以來源核對日期為準，示範資料取自 2026-10-31 的搜尋結果摘錄，正式使用前須人工抽查官方頁面。</p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">連結</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <Link className="hover:text-foreground" to="/marketplace/travel.jp-ticket-optimizer">Package 規格</Link>
              <Link className="hover:text-foreground" to="/developers">API／MCP</Link>
              <Link className="inline-flex items-center gap-1 hover:text-foreground" to="/admin">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                內部覆核
              </Link>
            </p>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden" aria-label="主要導覽">
        <div className="grid grid-cols-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')
              }
            >
              <n.icon className="h-5 w-5" aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
