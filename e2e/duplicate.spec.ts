import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// API-level test: verifies the server rejects a second submission per employee.
// Uses a unique throwaway emp_no and cleans up afterwards.
test('duplicate submissions are blocked by the server', async () => {
  const url = process.env.SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const svc = process.env.SUPABASE_SERVICE_KEY
  test.skip(!url || !anon || !svc, 'Supabase env not set')

  const pub = createClient(url!, anon!, { auth: { persistSession: false } })
  const admin = createClient(url!, svc!, { auth: { persistSession: false } })

  const empNo = 'E2E-DUP-' + Date.now()
  const emp = {
    emp_no: empNo, name: 'E2E Dup', dob: '1990-01-01',
    designation: 'QA', department: 'Test', boss: 'Test Boss', tenure: '1 year',
  }

  const { data: qs } = await admin.from('questions').select('set,number').eq('role', 'manager')
  const answers = (qs ?? []).map((q) => ({ set: q.set, question: q.number, choice: 'A' }))

  try {
    // 1st submission succeeds
    const first = await pub.rpc('submit_quiz', { p_employee: emp, p_role: 'manager', p_answers: answers })
    expect(first.error).toBeNull()

    // has_submitted now reports true
    const hs = await pub.rpc('has_submitted', { p_emp_no: empNo })
    expect(hs.data).toBe(true)

    // 2nd submission is rejected
    const second = await pub.rpc('submit_quiz', { p_employee: emp, p_role: 'manager', p_answers: answers })
    expect(second.error?.message ?? '').toContain('already_submitted')
  } finally {
    await admin.from('submissions').delete().eq('emp_no', empNo)
  }
})
