/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_APP_URL: string;
  readonly PUBLIC_ACCOUNTS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
