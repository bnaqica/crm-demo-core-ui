import { describe, expect, it } from 'vitest'
import { readConfig } from './config'

describe('readConfig', () => {
  it('defaults to the local core-service and crm-internal realm', () => {
    expect(readConfig({})).toEqual({
      coreBaseUrl: 'http://localhost:8081',
      oidcAuthority: 'http://localhost:8180/realms/crm-internal',
      oidcClientId: 'crm-app',
    })
  })

  it('uses VITE_ overrides and drops a trailing slash from the base URL', () => {
    expect(
      readConfig({
        VITE_CORE_BASE_URL: 'https://core.example.test/',
        VITE_OIDC_AUTHORITY: 'https://kc.example.test/realms/crm-internal',
        VITE_OIDC_CLIENT_ID: 'other',
      }),
    ).toEqual({
      coreBaseUrl: 'https://core.example.test',
      oidcAuthority: 'https://kc.example.test/realms/crm-internal',
      oidcClientId: 'other',
    })
  })
})
