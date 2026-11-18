export type AppConfig = {
  coreBaseUrl: string
  oidcAuthority: string
  oidcClientId: string
}

type Env = Partial<Record<'VITE_CORE_BASE_URL' | 'VITE_OIDC_AUTHORITY' | 'VITE_OIDC_CLIENT_ID', string>>

export function readConfig(env: Env): AppConfig {
  return {
    coreBaseUrl: (env.VITE_CORE_BASE_URL || 'http://localhost:8081').replace(/\/+$/, ''),
    oidcAuthority: env.VITE_OIDC_AUTHORITY || 'http://localhost:8180/realms/crm-internal',
    oidcClientId: env.VITE_OIDC_CLIENT_ID || 'crm-app',
  }
}

export const config = readConfig(import.meta.env)
