import { test, expect, type Page, type Route } from '@playwright/test'

// All Supabase RPCs are mocked here, so these tests never touch the real
// database (`npm run e2e` still needs VITE_SUPABASE_* set for the build).

const QUESTIONS = Array.from({ length: 30 }, (_, i) => ({
  position: i + 1,
  question_no: 30 - i, // day order differs from DAY 1 numbering
  text: `Sample question ${30 - i}?`,
}))

type Mock = { day: number | null; submitted?: unknown[]; already?: boolean }

async function mockSupabase(page: Page, mock: Mock) {
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route('**/rest/v1/rpc/**', async (route) => {
    const fn = route.request().url().split('/rpc/')[1].split('?')[0]
    const body = route.request().postDataJSON() ?? {}
    switch (fn) {
      case 'get_survey':
        return json(route, { day: mock.day, questions: mock.day == null ? [] : QUESTIONS })
      case 'has_submitted_survey':
        return json(route, !!mock.already)
      case 'submit_survey':
        mock.submitted?.push(body)
        return json(route, { id: 'x', day: mock.day })
      case 'get_survey_admin_data':
        if (body.p_password !== 'right') return json(route, { message: 'unauthorized' }, 400)
        return json(route, { active_day: mock.day, questions: QUESTIONS, submissions: [] })
      default:
        return json(route, { message: `unmocked ${fn}` }, 404)
    }
  })
}

async function fillDetails(page: Page) {
  await page.getByLabel(/^Name/).fill('Test Person')
  await page.getByLabel('Date of Birth').fill('1995-05-05')
  await page.getByLabel('Designation').fill('Analyst')
  await page.getByLabel('Department').fill('Operations')
}

async function assertNoHOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, `page overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1)
}

test('closed test shows a not-open message', async ({ page }) => {
  await mockSupabase(page, { day: null })
  await page.goto('')
  await expect(page.getByText(/not open right now/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Start Test/i })).toHaveCount(0)
})

test('validation blocks starting until required fields are filled', async ({ page }) => {
  await mockSupabase(page, { day: 2 })
  await page.goto('')
  await page.getByRole('button', { name: /Start Test/i }).click()
  await expect(page.getByText(/complete all required fields/i)).toBeVisible()
  await expect(page).not.toHaveURL(/#\/quiz/)
})

test('same name + DOB cannot start again on the same day', async ({ page }) => {
  await mockSupabase(page, { day: 2, already: true })
  await page.goto('')
  await fillDetails(page)
  await page.getByRole('button', { name: /Start Test/i }).click()
  await expect(page.getByText(/already completed today/i)).toBeVisible()
  await expect(page).not.toHaveURL(/#\/quiz/)
})

test('full flow: 30 questions, 5 options, breaks, submits every answer', async ({ page }) => {
  const submitted: { p_answers: { question_no: number; value: number }[]; p_person: Record<string, string> }[] = []
  await mockSupabase(page, { day: 2, submitted })
  await page.goto('')
  await expect(page.getByText(/· Day 2/)).toBeVisible()
  await fillDetails(page)
  await page.getByRole('button', { name: /Start Test/i }).click()

  await expect(page.getByText(/Question 1 of 30/i)).toBeVisible()
  await expect(page.getByTestId('option')).toHaveText(
    ['Highly Agree', 'Slightly Agree', 'Neutral', 'Disagree', 'Highly Disagree'])

  for (let i = 0; i < 30; i++) {
    await expect(page.getByText(`Question ${i + 1} of 30`)).toBeVisible()
    await page.getByTestId('option').nth(i % 5).click()
    await page.getByRole('button', { name: /^(Next|Submit)$/ }).click()
    if (i === 9 || i === 19) {
      await expect(page.getByText(`${i + 1} of 30 questions complete`)).toBeVisible()
      await page.getByRole('button', { name: /Continue/ }).click()
    }
  }
  await expect(page.getByRole('heading', { name: /Thank you/ })).toBeVisible()

  expect(submitted).toHaveLength(1)
  const { p_answers, p_person } = submitted[0]
  expect(p_person).toEqual({ name: 'Test Person', dob: '1995-05-05', designation: 'Analyst', department: 'Operations' })
  expect(p_answers).toHaveLength(30)
  // first question asked (question_no 30) got "Highly Agree" = 5, second got 4
  expect(p_answers.find((a) => a.question_no === 30)?.value).toBe(5)
  expect(p_answers.find((a) => a.question_no === 29)?.value).toBe(4)
})

test('admin rejects a wrong password and accepts the right one', async ({ page }) => {
  await mockSupabase(page, { day: 1 })
  await page.goto('#/admin')
  await page.getByPlaceholder('Password').fill('wrong')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText(/Incorrect password/i)).toBeVisible()
  await page.getByPlaceholder('Password').fill('right')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText(/Test status: Day 1 open/)).toBeVisible()
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('landing and quiz fit the viewport', async ({ page }) => {
    await mockSupabase(page, { day: 3 })
    await page.goto('')
    await fillDetails(page)
    await assertNoHOverflow(page)
    await page.getByRole('button', { name: /Start Test/i }).click()
    await expect(page.getByText(/Question 1 of 30/i)).toBeVisible()
    await assertNoHOverflow(page)
  })
})
