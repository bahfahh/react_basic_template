import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { CATALOG, emptyStore, TaskService, type StoreData } from '../src/core';
import { createApp } from './app';

const PORT = Number(process.env.PORT ?? 8787);
const STORE_FILE = resolve(process.env.LAZYPACK_STORE_FILE ?? '.data/store.json');
const WEB_BASE_URL = process.env.LAZYPACK_WEB_URL ?? 'http://localhost:5173';
const API_BASE_URL = process.env.LAZYPACK_API_URL ?? `http://localhost:${PORT}`;

function loadStore(): StoreData {
  try {
    const data = JSON.parse(readFileSync(STORE_FILE, 'utf8')) as StoreData;
    return data.version === 1 ? data : emptyStore();
  } catch {
    return emptyStore();
  }
}

let writeTimer: NodeJS.Timeout | undefined;
function persist(store: StoreData): void {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    mkdirSync(dirname(STORE_FILE), { recursive: true });
    writeFileSync(STORE_FILE, JSON.stringify(store));
  }, 100);
}

const service = new TaskService({ catalog: CATALOG, store: loadStore(), onChange: persist });
const handler = createApp({ service, webBaseUrl: WEB_BASE_URL, apiBaseUrl: API_BASE_URL });

createServer((req, res) => void handler(req, res)).listen(PORT, () => {
  console.log(`LazyPack API  → ${API_BASE_URL}/api`);
  console.log(`MCP Gateway   → ${API_BASE_URL}/mcp  (Bearer lp_demo_agent_alice)`);
  console.log(`Store         → ${STORE_FILE}`);
});
