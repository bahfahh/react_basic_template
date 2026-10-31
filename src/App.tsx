import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { ApiProvider } from '@/api/ApiProvider';
import { AppShell } from '@/components/AppShell';
import { AdminPage } from '@/pages/AdminPage';
import { DevelopersPage } from '@/pages/DevelopersPage';
import { IntakePage } from '@/pages/IntakePage';
import { LandingPage } from '@/pages/LandingPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PackagePage } from '@/pages/PackagePage';
import { TaskListPage } from '@/pages/TaskListPage';
import { TaskPage } from '@/pages/TaskPage';

const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <ApiProvider>
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<LandingPage />} />
            <Route path="start" element={<IntakePage />} />
            <Route path="tasks" element={<TaskListPage />} />
            <Route path="tasks/:id" element={<TaskPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/:id" element={<PackagePage />} />
            <Route path="developers" element={<DevelopersPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
    </ApiProvider>
  );
}
