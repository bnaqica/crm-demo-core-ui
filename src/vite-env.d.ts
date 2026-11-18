/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CORE_BASE_URL?: string
  readonly VITE_OIDC_AUTHORITY?: string
  readonly VITE_OIDC_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
