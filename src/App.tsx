import { BrowserRouter, HashRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { HandoffsPage } from '@/pages/HandoffsPage';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PackPage } from '@/pages/PackPage';

// Embedded demo hosts may not allow path-style hashes, so the demo build keeps routing in memory.
const Router = { hash: HashRouter, memory: MemoryRouter, browser: BrowserRouter }[import.meta.env.VITE_ROUTER ?? 'browser'];

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="p/:id" element={<PackPage />} />
          <Route path="handoffs" element={<HandoffsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
