/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Yalnızca uçtan uca testlerde (VITE_E2E=1) savaş sahnesini window'a açar */
  readonly VITE_E2E?: string;
}

declare module '*.jpg?inline' {
  const source: string;
  export default source;
}

declare module '*.webp?inline' {
  const source: string;
  export default source;
}

declare const __APP_VERSION__: string;
