import { test, expect } from '@playwright/test'

// A TEST account (top of the list) so e2e never touches real employees.
const EMP = 'Samrendra'

test('landing page loads with branding', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('heading', { name: /Psychometric/i })).toBeVisible()
  await expect(page.getByRole('img', { name: /logo/i })).toBeVisible()
})

test('employee search filters the list', async ({ page }) => {
  await page.goto('')
  await page.getByPlaceholder(/Search by name/i).fill('Samr')
  await expect(page.getByRole('button', { name: new RegExp(EMP) })).toBeVisible()
  await expect(page.getByRole('button', { name: /Bala/ })).toHaveCount(0)
})

test('form validation blocks starting until required fields are filled', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: new RegExp(EMP) }).click()
  await expect(page.getByText(/2\. Confirm your details/i)).toBeVisible()

  // Try to start with an empty form -> validation message, still on landing
  await page.getByRole('button', { name: /Start Test/i }).click()
  await expect(page.getByText(/complete all required fields/i)).toBeVisible()
  await expect(page).not.toHaveURL(/#\/quiz/)
})

test('full landing -> quiz flow reaches the motivational break after 10 questions', async ({ page }) => {
  await page.goto('')
  await page.getByRole('button', { name: new RegExp(EMP) }).click()

  await page.getByLabel('Date of Birth').fill('1995-05-05')
  await page.getByLabel('Designation').fill('Analyst')
  await page.getByLabel('Department').fill('Operations')
  await page.getByLabel('Reporting Boss Name').fill('Test Boss')
  await page.getByLabel('Months / Years in Current Job').fill('3 years')
  await page.getByRole('button', { name: /^Others/ }).click()
  await page.getByRole('button', { name: /Start Test/i }).click()

  // Quiz loaded
  await expect(page.getByText(/Question 1 of 60/i)).toBeVisible()

  // Answer the first 10 questions (do NOT submit — avoids writing to the DB)
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('option').first().click()
    await page.getByRole('button', { name: /^(Next|Submit)$/ }).click()
  }
  // Motivational break appears
  await expect(page.getByText(/10 of 60 questions complete/i)).toBeVisible()
})

test('admin rejects a wrong password', async ({ page }) => {
  await page.goto('#/admin')
  await expect(page.getByRole('heading', { name: /Admin access/i })).toBeVisible()
  await page.getByPlaceholder('Password').fill('definitely-wrong')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText(/Incorrect password/i)).toBeVisible()
})

test('admin accepts the correct password and shows reports', async ({ page }) => {
  test.skip(!process.env.ADMIN_PW, 'ADMIN_PW env var not set')
  await page.goto('#/admin')
  await page.getByPlaceholder('Password').fill(process.env.ADMIN_PW!)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await expect(page.getByText(/Employees per Boss/i)).toBeVisible()
})
