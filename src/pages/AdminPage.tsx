import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { exportRows } from '@/lib/exportXlsx'
import { SECTION_ORDER, type Question, type Role, type Submission } from '@/lib/types'

export default function AdminPage() {
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authErr, setAuthErr] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const [subs, setSubs] = useState<Submission[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  const [role, setRole] = useState<Role>('manager')
  const [bossFilter, setBossFilter] = useState<string>('')
  const [selected, setSelected] = useState<Submission | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)

  async function login() {
    setChecking(true)
    setAuthErr(null)
    const { data, error } = await supabase.rpc('get_admin_data', { p_password: pw })
    if (error) {
      setAuthErr('Incorrect password.')
      setChecking(false)
      return
    }
    setSubs((data?.submissions as Submission[]) ?? [])
    const q = await supabase.from('questions').select('*')
    setQuestions((q.data as Question[]) ?? [])
    setAuthed(true)
    setChecking(false)
  }

  // question lookup: role-set-number -> question
  const qLookup = useMemo(() => {
    const m = new Map<string, Question>()
    for (const q of questions) m.set(`${q.role}-${q.set}-${q.number}`, q)
    return m
  }, [questions])

  const roleSubs = useMemo(() => subs.filter((s) => s.role === role), [subs, role])

  // Segment: group by department + boss
  const segment = useMemo(() => {
    const map = new Map<string, { department: string; boss: string; employees: string[] }>()
    for (const s of roleSubs) {
      const boss = s.boss || '—'
      const dept = s.department || '—'
      const key = `${dept}||${boss}`
      if (!map.has(key)) map.set(key, { department: dept, boss, employees: [] })
      map.get(key)!.employees.push(s.name || s.emp_no || '—')
    }
    let rows = [...map.values()]
    if (bossFilter) rows = rows.filter((r) => r.boss === bossFilter)
    return rows
  }, [roleSubs, bossFilter])

  const bosses = useMemo(
    () => [...new Set(roleSubs.map((s) => s.boss).filter(Boolean))].sort(),
    [roleSubs],
  )

  if (!authed) {
    return (
      <div className="app-bg min-h-svh">
        <Header />
        <main className="mx-auto flex max-w-sm flex-col items-center px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="brand-gradient mx-auto flex size-12 items-center justify-center rounded-xl text-white">
              <Lock className="size-5" />
            </div>
            <h1 className="mt-4 text-center text-xl font-bold">Admin access</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">Enter the password to view reports.</p>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && login()}
              placeholder="Password"
              className="mt-4 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            {authErr && <p className="mt-2 text-sm text-destructive">{authErr}</p>}
            <Button className="mt-3 w-full" disabled={checking || !pw} onClick={login}>
              {checking ? 'Checking…' : 'Enter'}
            </Button>
          </motion.div>
        </main>
      </div>
    )
  }

  function exportSegment() {
    exportRows(
      segment.map((r, i) => ({
        'S.No': i + 1,
        Department: r.department,
        'Reporting Boss': r.boss,
        Employees: r.employees.join(', '),
        Count: r.employees.length,
      })),
      'Segment',
      `segment-${role}.xlsx`,
    )
  }

  function exportMaster() {
    exportRows(
      roleSubs.map((s) => ({
        'Emp No.': s.emp_no,
        Name: s.name,
        'Date of Birth': s.dob ?? '',
        Designation: s.designation,
        Department: s.department,
        'Reporting Boss': s.boss,
        ...Object.fromEntries(SECTION_ORDER.map((sec) => [sec, s.section_scores?.[sec] ?? 0])),
        Total: s.total,
      })),
      'Master',
      `master-report-${role}.xlsx`,
    )
  }

  return (
    <div className="app-bg min-h-svh">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold"><span className="brand-text-gradient">Reports</span></h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['manager', 'others'] as Role[]).map((r) => (
            <Button
              key={r}
              variant={role === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setRole(r); setBossFilter(''); setSelected(null) }}
            >
              {r === 'manager' ? 'Manager & Above' : 'Others'}
            </Button>
          ))}
          <span className="ml-auto self-center text-sm text-muted-foreground">
            {roleSubs.length} completed
          </span>
        </div>

        {/* Segment report */}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Employees per Boss</h2>
          <div className="flex items-center gap-2">
            <select
              value={bossFilter}
              onChange={(e) => setBossFilter(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              <option value="">All bosses</option>
              {bosses.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={exportSegment}>Export Excel</Button>
          </div>
        </div>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><Th>S.No.</Th><Th>Department</Th><Th>Reporting Boss</Th><Th>Employees</Th><Th>Count</Th></tr>
            </thead>
            <tbody>
              {segment.map((r, i) => (
                <tr key={r.department + r.boss} className="border-t">
                  <Td>{i + 1}</Td><Td>{r.department}</Td><Td>{r.boss}</Td>
                  <Td>{r.employees.join(', ')}</Td><Td>{r.employees.length}</Td>
                </tr>
              ))}
              {segment.length === 0 && <tr><Td colSpan={5}>No data yet.</Td></tr>}
            </tbody>
          </table>
        </div>

        {/* Master report */}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Master Report</h2>
          <Button size="sm" variant="outline" onClick={exportMaster}>Export Excel</Button>
        </div>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <Th>Emp No.</Th><Th>Name</Th><Th>DOB</Th><Th>Designation</Th><Th>Department</Th><Th>Boss</Th>
                {SECTION_ORDER.map((s) => <Th key={s}>{s}</Th>)}
                <Th>Total</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {roleSubs.map((s) => (
                <tr key={s.id} className="border-t hover:bg-accent/40">
                  <Td>{s.emp_no}</Td><Td>{s.name}</Td><Td>{s.dob ?? ''}</Td>
                  <Td>{s.designation}</Td><Td>{s.department}</Td><Td>{s.boss}</Td>
                  {SECTION_ORDER.map((sec) => <Td key={sec}>{s.section_scores?.[sec] ?? 0}</Td>)}
                  <Td>{s.total}</Td>
                  <Td><Button size="sm" variant="outline" onClick={() => setSelected(s)}>View</Button></Td>
                </tr>
              ))}
              {roleSubs.length === 0 && <tr><Td colSpan={SECTION_ORDER.length + 8}>No results yet.</Td></tr>}
            </tbody>
          </table>
        </div>

        {/* Per-employee drill-down */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8 rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.name} — {selected.emp_no}</h2>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAnswers(true)}>View answers</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {SECTION_ORDER.map((sec) => (
                <div key={sec} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sec}</span>
                    <span className="font-semibold">{selected.section_scores?.[sec] ?? 0}/50</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.interpretations?.[sec] ?? '—'}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-right font-semibold">Total: {selected.total}/300</p>
          </motion.div>
        )}

        {/* Answer-detail popup */}
        <Modal open={showAnswers} onClose={() => setShowAnswers(false)} title={`Answers — ${selected?.name ?? ''}`}>
          {selected && <AnswerDetail submission={selected} qLookup={qLookup} />}
        </Modal>
      </main>
    </div>
  )
}

function AnswerDetail({ submission, qLookup }: { submission: Submission; qLookup: Map<string, Question> }) {
  const bySet = useMemo(() => {
    const m = new Map<number, typeof submission.answers>()
    for (const a of submission.answers) {
      if (!m.has(a.set)) m.set(a.set, [])
      m.get(a.set)!.push(a)
    }
    for (const arr of m.values()) arr.sort((x, y) => x.question - y.question)
    return [...m.entries()].sort((x, y) => x[0] - y[0])
  }, [submission])

  let running = 0
  return (
    <div className="space-y-6">
      {bySet.map(([setNo, arr]) => {
        const section = arr[0]?.section ?? `Set ${setNo}`
        const subtotal = arr.reduce((t, a) => t + a.points, 0)
        running += subtotal
        return (
          <div key={setNo}>
            <h4 className="font-semibold">Set {setNo} — {section}</h4>
            <table className="mt-2 w-full text-sm">
              <thead className="bg-muted">
                <tr><Th>Q</Th><Th>Question</Th><Th>Chosen</Th><Th>Points</Th></tr>
              </thead>
              <tbody>
                {arr.map((a) => {
                  const q = qLookup.get(`${submission.role}-${a.set}-${a.question}`)
                  // Prefer the option text snapshotted at submit time; fall back to
                  // a live lookup only for older rows saved before snapshots existed.
                  const chosenText = a.text ?? q?.options.find((o) => o.key === a.choice)?.text
                  return (
                    <tr key={a.question} className="border-t align-top">
                      <Td>{a.question}</Td>
                      <td className="min-w-[12rem] px-3 py-2 align-top whitespace-normal">
                        <div>{q?.text ?? `Q${a.question}`}</div>
                        {chosenText && <div className="text-muted-foreground">{a.choice}. {chosenText}</div>}
                      </td>
                      <Td>{a.choice}</Td>
                      <Td>{a.points}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-1 text-right text-sm">
              Set subtotal: <b>{subtotal}/50</b> · Running total: <b>{running}</b>
            </p>
          </div>
        )
      })}
      <p className="text-right font-semibold">Grand total: {submission.total}/300</p>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>
}
function Td({ children, colSpan }: { children?: React.ReactNode; colSpan?: number }) {
  return <td className="px-3 py-2 whitespace-nowrap" colSpan={colSpan}>{children}</td>
}
