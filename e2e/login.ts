import { createHmac } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'

export type TestUser = { username: string; password: string; totpSecret: string }

/** Reads E2E_<NAME>_USERNAME / _PASSWORD / _TOTP_SECRET; skips the test when any is missing. */
export function userFromEnv(name: string): TestUser {
  const get = (key: string) => process.env[`E2E_${name}_${key}`] ?? ''
  const user = { username: get('USERNAME'), password: get('PASSWORD'), totpSecret: get('TOTP_SECRET') }
  test.skip(!user.username || !user.password || !user.totpSecret, `E2E_${name}_* variables not set`)
  return user
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of input.replace(/=+$/, '').replace(/\s/g, '').toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, '0')
  }
  const bytes = bits.match(/.{8}/g) ?? []
  return Buffer.from(bytes.map((b) => parseInt(b, 2)))
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s), as Keycloak uses by default. */
export function totp(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)))
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = (hmac[hmac.length - 1] ?? 0) & 0xf
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return code.toString().padStart(6, '0')
}

/** Opens `path`, completes the crm-internal login (password + OTP) and waits to be back on `path`. */
export async function signIn(page: Page, user: TestUser, path = '/') {
  await page.goto(path)
  await page.waitForURL(/\/realms\/crm-internal\//)
  await page.getByLabel(/username/i).fill(user.username)
  await page.getByLabel(/^password/i).fill(user.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.getByLabel(/one-time code/i).fill(totp(user.totpSecret))
  await page.getByRole('button', { name: /sign in|log in|submit/i }).click()
  await page.waitForURL((url) => url.origin === 'http://localhost:5173' && url.pathname === path.split('?')[0])
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}
