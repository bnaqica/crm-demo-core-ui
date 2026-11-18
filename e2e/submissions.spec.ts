import { expect, test } from '@playwright/test'
import { signIn, userFromEnv } from './login'

/**
 * Needs at least one RECEIVED submission routed to the writer's team (team A), e.g. created through the portal
 * (customer-portal-ui → portal-intake → core-service), and the Super Manager not being a member of team B's
 * submission used by the second test (E2E_TEAM_B_SUBMISSION_ID).
 */
test('a team member accepts a RECEIVED submission', async ({ page }) => {
  const user = userFromEnv('WRITER')
  await signIn(page, user, '/submissions?status=RECEIVED')
  const firstOpen = page.getByRole('link', { name: /open submission/i }).first()
  await expect(firstOpen).toBeVisible()
  await firstOpen.click()
  await page.getByRole('button', { name: 'Accept' }).click()
  await expect(page.locator('dl.details dd').first()).toHaveText('ACCEPTED')
  await expect(page.getByRole('button', { name: 'Accept' })).toHaveCount(0)
})

test('a Super Manager sees another team’s submission read-only', async ({ page }) => {
  const user = userFromEnv('SUPER')
  const id = process.env.E2E_TEAM_B_SUBMISSION_ID ?? ''
  test.skip(!id, 'E2E_TEAM_B_SUBMISSION_ID not set')
  await signIn(page, user, `/submissions/${id}`)
  await expect(page.getByText('Read-only')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0)
})
