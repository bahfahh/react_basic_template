import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="懶人包首頁">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
      <span className="text-lg font-black tracking-tight">懶人包</span>
    </Link>
  );
}

const NAV = [
  { to: '/', label: '懶人包', end: true },
  { to: '/handoffs', label: '我的交辦', end: false },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky z-30 border-b bg-background/90 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav className="flex gap-1" aria-label="主要導覽">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn('rounded-lg px-3 py-1.5 text-sm font-medium', isActive ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8">
        <Outlet />
      </main>
      <footer className="border-t">
        <p className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground">
          原型：交給 AI 的開啟連結目前是模擬的；懶人包網址放在 GitHub 上，AI 可以直接讀取。懶人包裡的資料來自 2026-10-31 的搜尋摘錄，每筆都附來源，使用前需人工核對官方頁面。
        </p>
      </footer>
    </div>
  );
}
