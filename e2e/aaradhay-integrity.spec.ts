import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// End-to-end integrity check:
//  1. reset all responses (also re-enables Aaradhay TEST-4 + Yashika TEST-5)
//  2. drive the quiz as Aaradhay, Manager & Above, recording every answer
//  3. verify the admin panel shows exactly the answers we picked
//  4. verify the scoring against the answer key
//
// Run: npx playwright test e2e/aaradhay-integrity.spec.ts

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false },
})

// Destructive (clears ALL submissions in setup) — opt in explicitly so the
// normal `npm run e2e` suite never wipes real data:
//   RUN_INTEGRITY=1 npx playwright test e2e/aaradhay-integrity.spec.ts
const RUN_INTEGRITY = process.env.RUN_INTEGRITY === '1'

const ROLE = 'manager'
const EMP_NO = 'TEST-4'
const EMP_NAME = 'Aaradhay Astitva'

type Rec = { set: number; number: number; key: string; text: string }
const record: Rec[] = []
let adminPw = ''
let keyMap = new Map<string, Record<string, number>>()   // `${set}-${q}` -> {A:..,B:..}
let setSection = new Map<number, string>()                 // set -> section name

test.beforeAll(async () => {
  if (!RUN_INTEGRITY) return
  // reset: clear ALL responses (re-enables Aaradhay + Yashika automatically)
  await db.from('submissions').delete().not('emp_no', 'is', null)
  await db.from('submissions').delete().is('emp_no', null)

  const cfg = await db.from('admin_config').select('password').single()
  adminPw = cfg.data!.password

  const keys = await db.from('answer_keys').select('set,question,points').eq('role', ROLE)
  for (const k of keys.data!) keyMap.set(`${k.set}-${k.question}`, k.points as Record<string, number>)

  const qs = await db.from('questions').select('set,section').eq('role', ROLE)
  for (const q of qs.data!) setSection.set(q.set, q.section)
})

test('Aaradhay quiz → admin display + scoring integrity', async ({ page }) => {
  test.skip(!RUN_INTEGRITY, 'destructive integrity test; run with RUN_INTEGRITY=1')
  test.setTimeout(240_000)

  // ---------- 1. Landing: pick Aaradhay, fill form, Manager & Above ----------
  await page.goto('')
  await page.getByPlaceholder(/Search by name or ID/i).fill('Aaradhay')
  await page.locator('li button', { hasText: EMP_NAME }).click()

  await page.locator('#f-date-of-birth').fill('1990-05-15')
  await page.locator('#f-designation').fill('Head of Engineering')
  await page.locator('#f-department').fill('Technology')
  await page.locator('#f-reporting-boss-name').fill('CEO Office')
  await page.locator('#f-months-years-in-current-job').fill('3 years')

  await page.locator('button:has-text("Manager & Above")').first().click()
  await page.getByRole('button', { name: /Start Test/i }).click()

  // ---------- 2. Answer 60 questions, recording each ----------
  await expect(page.locator('[data-testid="option"]').first()).toBeVisible()
  let prevQ = ''
  for (let i = 0; i < 60; i++) {
    const isLast = i === 59
    const set = Math.floor(i / 10) + 1
    const number = (i % 10) + 1

    await expect(page.getByText(`Question ${i + 1} of 60`, { exact: true })).toBeVisible()
    // The question card animates in (AnimatePresence). Wait until the exiting
    // card is gone and this question's card has mounted before reading its
    // options, otherwise the previous card's option text can be captured.
    if (i > 0) {
      await expect
        .poll(async () => (await page.locator('main h2').innerText()).trim(), { timeout: 10_000 })
        .not.toBe(prevQ)
    }
    const opts = page.locator('[data-testid="option"]')
    await expect(opts.first()).toBeVisible()
    const qtext = (await page.locator('main h2').innerText()).trim()
    const n = await opts.count()
    const j = i % n // vary A/B/C/D so scoring is non-trivial

    const spans = opts.nth(j).locator(':scope > span')
    const key = (await spans.first().innerText()).trim()
    const text = (await spans.last().innerText()).trim()
    record.push({ set, number, key, text })

    await opts.nth(j).click()

    if (isLast) {
      await page.getByRole('button', { name: /Submit/i }).click()
    } else {
      await page.getByRole('button', { name: /^Next/i }).click()
      if ((i + 1) % 10 === 0) {
        await page.getByRole('button', { name: /Continue/i }).click()
      }
    }
    prevQ = qtext
  }
  await expect(page.getByText(/Thank you/i)).toBeVisible({ timeout: 20_000 })
  console.log(`\nRecorded ${record.length} answers. Sample:`, JSON.stringify(record[0]))

  // ---------- 3. Admin panel: open Aaradhay's answers and compare ----------
  await page.goto('#/admin')
  await page.locator('input[type="password"]').fill(adminPw)
  await page.getByRole('button', { name: /^Enter$/i }).click()
  await expect(page.getByRole('heading', { name: /Reports/i })).toBeVisible()
  await page.getByRole('button', { name: 'Manager & Above' }).click()

  await page
    .locator('tr')
    .filter({ hasText: EMP_NAME })
    .filter({ has: page.getByRole('button', { name: 'View' }) })
    .getByRole('button', { name: 'View' })
    .click()
  await page.getByRole('button', { name: 'View answers' }).click()

  const modal = page.locator('div.z-50')
  await expect(modal.getByText(/Answers —/i)).toBeVisible()
  const tables = modal.locator('table')
  await expect(tables).toHaveCount(6)

  // scrape admin: table t -> set t+1, row r -> question r+1
  const admin: { set: number; number: number; choice: string; text: string; points: number }[] = []
  for (let t = 0; t < 6; t++) {
    const rows = tables.nth(t).locator('tbody tr')
    const rc = await rows.count()
    for (let r = 0; r < rc; r++) {
      const cells = rows.nth(r).locator('td')
      const number = Number((await cells.nth(0).innerText()).trim())
      const cellText = (await cells.nth(1).innerText()).trim() // "Question\nK. chosen text"
      const choice = (await cells.nth(2).innerText()).trim()
      const points = Number((await cells.nth(3).innerText()).trim())
      // chosen text is the part after "K. " on the last line
      const shown = cellText.split('\n').map((s) => s.trim()).find((s) => s.startsWith(`${choice}.`)) ?? ''
      const text = shown.replace(new RegExp(`^${choice}\\.\\s*`), '')
      admin.push({ set: t + 1, number, choice, text, points })
    }
  }

  // compare admin display vs what we recorded
  let choiceMismatch = 0, textMismatch = 0
  for (const rec of record) {
    const a = admin.find((x) => x.set === rec.set && x.number === rec.number)!
    if (a.choice !== rec.key) {
      choiceMismatch++
      console.log(`  CHOICE MISMATCH set${rec.set} q${rec.number}: picked ${rec.key}, admin ${a.choice}`)
    }
    if (a.text.trim() !== rec.text.trim()) {
      textMismatch++
      console.log(`  TEXT MISMATCH set${rec.set} q${rec.number}:\n    picked: ${rec.text}\n    admin : ${a.text}`)
    }
  }
  console.log(`Admin display — choice mismatches: ${choiceMismatch}, text mismatches: ${textMismatch}`)

  // ---------- 4. Scoring verification against the answer key ----------
  let expectedTotal = 0
  const expectedSection = new Map<string, number>()
  let pointsMismatch = 0
  for (const rec of record) {
    const pts = keyMap.get(`${rec.set}-${rec.number}`)?.[rec.key] ?? 0
    expectedTotal += pts
    const sec = setSection.get(rec.set)!
    expectedSection.set(sec, (expectedSection.get(sec) ?? 0) + pts)
    const a = admin.find((x) => x.set === rec.set && x.number === rec.number)!
    if (a.points !== pts) {
      pointsMismatch++
      console.log(`  POINTS MISMATCH set${rec.set} q${rec.number} (${rec.key}): key says ${pts}, admin shows ${a.points}`)
    }
  }

  // ground-truth from the stored submission
  const sub = (await db.from('submissions').select('*').eq('emp_no', EMP_NO).single()).data!
  console.log('\nScoring:')
  console.log(`  expected total (from answer key): ${expectedTotal}`)
  console.log(`  stored submission total         : ${sub.total}`)
  for (const [sec, val] of expectedSection) {
    console.log(`  ${sec}: expected ${val} / stored ${sub.section_scores?.[sec]}`)
    expect(sub.section_scores?.[sec], `section ${sec}`).toBe(val)
  }

  // ---------- assertions ----------
  expect(choiceMismatch, 'admin choices match input').toBe(0)
  expect(textMismatch, 'admin option text matches input').toBe(0)
  expect(pointsMismatch, 'admin points match answer key').toBe(0)
  expect(sub.total, 'stored total matches answer key').toBe(expectedTotal)

  console.log('\nALL CHECKS PASSED ✅')
})
