import { test, expect, type Page } from '@playwright/test'

// Run this file at a typical phone size.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function assertNoHOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow, `page overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1)
}

test('landing fits the mobile viewport', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('heading', { name: /Psychometric/i })).toBeVisible()
  await assertNoHOverflow(page)
})

test('landing -> quiz flow fits on mobile', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: /Samrendra/ }).click()
  await page.getByLabel('Date of Birth').fill('1995-05-05')
  await page.getByLabel('Designation').fill('Analyst')
  await page.getByLabel('Department').fill('Ops')
  await page.getByLabel('Reporting Boss Name').fill('Boss')
  await page.getByLabel('Months / Years in Current Job').fill('2')
  await assertNoHOverflow(page)
  await page.getByRole('button', { name: /^Others/ }).click()
  await page.getByRole('button', { name: /Start Test/i }).click()
  await expect(page.getByText(/Question 1 of 60/i)).toBeVisible()
  await assertNoHOverflow(page)
})

test('admin gate fits on mobile', async ({ page }) => {
  await page.goto('#/admin')
  await expect(page.getByRole('heading', { name: /Admin access/i })).toBeVisible()
  await assertNoHOverflow(page)
})

test('admin reports fit on mobile (wide tables scroll inside their own box)', async ({ page }) => {
  test.skip(!process.env.ADMIN_PW, 'ADMIN_PW not set')
  await page.goto('#/admin')
  await page.getByPlaceholder('Password').fill(process.env.ADMIN_PW!)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await assertNoHOverflow(page)
})
