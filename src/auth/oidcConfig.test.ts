import { describe, expect, it } from 'vitest'
import { User } from 'oidc-client-ts'
import { buildOidcConfig, returnPathAfterSignin } from './oidcConfig'

const config = { coreBaseUrl: 'http://localhost:8081', oidcAuthority: 'http://kc/realms/crm-internal', oidcClientId: 'crm-app' }

describe('buildOidcConfig', () => {
  it('uses the crm-internal authority, crm-app client and code flow with this origin as redirect', () => {
    const oidc = buildOidcConfig(config, 'http://localhost:5173')
    expect(oidc.authority).toBe('http://kc/realms/crm-internal')
    expect(oidc.client_id).toBe('crm-app')
    expect(oidc.response_type).toBe('code')
    expect(oidc.redirect_uri).toBe('http://localhost:5173/')
    expect(oidc.post_logout_redirect_uri).toBe('http://localhost:5173/')
  })

  it('keeps the signed-in user (tokens) out of localStorage and sessionStorage', async () => {
    localStorage.clear()
    sessionStorage.clear()
    const oidc = buildOidcConfig(config, 'http://localhost:5173')
    const user = new User({ access_token: 'secret-token', token_type: 'Bearer', profile: { sub: 'u', iss: 'i', aud: 'a', exp: 0, iat: 0 } })
    const store = oidc.userStore
    if (!store) throw new Error('userStore must be configured')
    await store.set('user:x', user.toStorageString())

    expect(await store.get('user:x')).toContain('secret-token')
    expect(JSON.stringify({ ...localStorage })).not.toContain('secret-token')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('secret-token')
  })
})

describe('returnPathAfterSignin', () => {
  it('returns the page stored in the sign-in state', () => {
    expect(returnPathAfterSignin({ state: { returnTo: '/submissions?status=RECEIVED' } })).toBe('/submissions?status=RECEIVED')
  })

  it('drops OIDC callback parameters from the stored page', () => {
    expect(returnPathAfterSignin({ state: { returnTo: '/?code=a&state=b&error=login_required&foo=1' } })).toBe('/?foo=1')
  })

  it('falls back to home for missing or off-site targets', () => {
    expect(returnPathAfterSignin({ state: undefined })).toBe('/')
    expect(returnPathAfterSignin({ state: { returnTo: '//evil.example' } })).toBe('/')
    expect(returnPathAfterSignin({ state: { returnTo: 'https://evil.example' } })).toBe('/')
  })
})
