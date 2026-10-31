import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createHttpApi } from './http';
import { createLocalApi } from './local';
import type { LazyPackApi } from './types';

const ApiContext = createContext<LazyPackApi | null>(null);

async function detectApi(): Promise<LazyPackApi> {
  const mode = import.meta.env.VITE_API_MODE ?? 'auto';
  if (mode === 'local') return createLocalApi();
  if (mode === 'http') return createHttpApi();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(timer);
    const body = res.ok ? await res.json() : null;
    if (body?.ok) return createHttpApi();
  } catch {
    // fall through to local mode
  }
  return createLocalApi();
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<LazyPackApi | null>(null);
  useEffect(() => {
    void detectApi().then(setApi);
  }, []);
  if (!api) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" role="status">
        正在連線懶人包…
      </div>
    );
  }
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): LazyPackApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used inside <ApiProvider>');
  return api;
}
