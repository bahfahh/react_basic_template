/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROUTER?: 'browser' | 'hash' | 'memory';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
