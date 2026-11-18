import { expect, test } from '@playwright/test'
import { signIn, userFromEnv } from './login'

test('a read-only team member sees only what they may read', async ({ page }) => {
  const user = userFromEnv('READONLY')
  await signIn(page, user)
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Routing rules' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Team dashboard' })).toHaveCount(0)
})

test('a Super Manager signs in, sees their teams and signs out of Keycloak', async ({ page }) => {
  const user = userFromEnv('SUPER')
  await signIn(page, user)
  await expect(page.getByRole('combobox', { name: 'Team' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  // End-session redirect returns to the app, which must ask for a fresh login (the SSO session is gone).
  await page.waitForURL(/\/realms\/crm-internal\/protocol\/openid-connect\/auth/)
  await expect(page.getByLabel(/username/i)).toBeVisible()
})

test('the crm-internal login offers Keycloak’s forgot-password flow with its generic message', async ({ page }) => {
  userFromEnv('READONLY')
  await page.goto('/')
  await page.waitForURL(/\/realms\/crm-internal\//)
  await page.getByRole('link', { name: /forgot password/i }).click()
  await expect(page).toHaveURL(/reset-credentials/)
  await page.getByLabel(/username or email/i).fill('nobody-e2e@example.invalid')
  await page.getByRole('button', { name: /submit/i }).click()
  await expect(page.getByText(/you should receive an email shortly/i)).toBeVisible()
})
