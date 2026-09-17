import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import Header from '@/components/Header'
import Modal from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { exportSheets } from '@/lib/exportXlsx'
import type { AdminData, Submission } from '@/lib/types'

const DAYS = [1, 2, 3] as const
type DayFilter = 'all' | (typeof DAYS)[number]

// Submission time is stored in UTC; always show it in IST so the admin page and
// the Excel export read the same regardless of the viewer's timezone.
const TZ = 'Asia/Kolkata'
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()

export default function AdminPage() {
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authErr, setAuthErr] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const [data, setData] = useState<AdminData>({ active_day: null, questions: [], submissions: [] })
  const [dayErr, setDayErr] = useState<string | null>(null)
  const [savingDay, setSavingDay] = useState(false)

  const [dayFilter, setDayFilter] = useState<DayFilter>('all')
  const [deptFilter, setDeptFilter] = useState<string>('')
  const [selected, setSelected] = useState<Submission | null>(null)

  async function load() {
    const { data: d, error } = await supabase.rpc('get_survey_admin_data', { p_password: pw })
    if (error) return false
    setData(d as AdminData)
    return true
  }

  async function login() {
    setChecking(true)
    setAuthErr(null)
    if (await load()) setAuthed(true)
    else setAuthErr('Incorrect password.')
    setChecking(false)
  }

  async function setActiveDay(day: number | null) {
    const label = day == null ? 'close the test' : `open Day ${day}`
    if (!window.confirm(`Are you sure you want to ${label}? This takes effect immediately for everyone.`)) return
    setSavingDay(true)
    setDayErr(null)
    const { error } = await supabase.rpc('set_active_day', { p_password: pw, p_day: day })
    if (error) setDayErr(error.message)
    else await load()
    setSavingDay(false)
  }

  const dayFiltered = useMemo(
    () => data.submissions.filter((s) => dayFilter === 'all' || s.day === dayFilter),
    [data.submissions, dayFilter],
  )
  const departments = useMemo(
    () => [...new Set(dayFiltered.map((s) => s.department).filter((d): d is string => !!d))].sort(),
    [dayFiltered],
  )
  const filtered = useMemo(
    () => dayFiltered.filter((s) => !deptFilter || s.department === deptFilter),
    [dayFiltered, deptFilter],
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

  // One row per submission; answers in DAY 1 question order so days line up.
  function exportResponses() {
    const rows = filtered.map((s) => {
      const byNo = new Map(s.answers.map((a) => [a.question_no, a]))
      return {
        Day: s.day,
        'Date (IST)': fmtDate(s.created_at),
        'Time (IST)': fmtTime(s.created_at),
        Name: s.name,
        'Date of Birth': s.dob,
        Designation: s.designation ?? '',
        Department: s.department ?? '',
        ...Object.fromEntries(data.questions.map((q) => [`Q${q.question_no}`, byNo.get(q.question_no)?.label ?? ''])),
      }
    })
    const questions = data.questions.map((q) => ({ 'Q No.': `Q${q.question_no}`, Question: q.text }))
    const suffix = `${dayFilter === 'all' ? 'all-days' : `day-${dayFilter}`}${deptFilter ? `-${deptFilter}` : ''}`
    exportSheets([{ name: 'Responses', rows }, { name: 'Questions', rows: questions }], `responses-${suffix}.xlsx`)
  }

  return (
    <div className="app-bg min-h-svh">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold"><span className="brand-text-gradient">Reports</span></h1>

        {/* Open day control */}
        <section className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-semibold">
              Test status: {data.active_day == null ? 'Closed' : `Day ${data.active_day} open`}
            </span>
            {DAYS.map((d) => (
              <Button key={d} size="sm" disabled={savingDay || data.active_day === d}
                variant={data.active_day === d ? 'default' : 'outline'} onClick={() => setActiveDay(d)}>
                Open Day {d}
              </Button>
            ))}
            <Button size="sm" disabled={savingDay || data.active_day == null}
              variant={data.active_day == null ? 'default' : 'outline'} onClick={() => setActiveDay(null)}>
              Close test
            </Button>
          </div>
          {dayErr && <p className="mt-2 text-sm text-destructive">{dayErr}</p>}
        </section>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(['all', ...DAYS] as DayFilter[]).map((d) => (
            <Button key={d} size="sm" variant={dayFilter === d ? 'default' : 'outline'}
              onClick={() => { setDayFilter(d); setDeptFilter(''); setSelected(null) }}>
              {d === 'all' ? 'All days' : `Day ${d}`}
            </Button>
          ))}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="ml-auto self-center text-sm text-muted-foreground">{filtered.length} completed</span>
        </div>

        {/* Responses */}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Responses</h2>
          <Button size="sm" variant="outline" onClick={exportResponses}>Export Excel (all answers)</Button>
        </div>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <Th>Day</Th><Th>Name</Th><Th>DOB</Th><Th>Designation</Th><Th>Department</Th><Th>Date</Th><Th>Time (IST)</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t hover:bg-accent/40">
                  <Td>{s.day}</Td><Td>{s.name}</Td><Td>{s.dob}</Td>
                  <Td>{s.designation}</Td><Td>{s.department}</Td>
                  <Td>{fmtDate(s.created_at)}</Td><Td>{fmtTime(s.created_at)}</Td>
                  <Td><Button size="sm" variant="outline" onClick={() => setSelected(s)}>View answers</Button></Td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><Td colSpan={8}>No results yet.</Td></tr>}
            </tbody>
          </table>
        </div>

        <Modal open={!!selected} onClose={() => setSelected(null)}
          title={selected ? `Day ${selected.day} — ${selected.name} · ${fmtDate(selected.created_at)}, ${fmtTime(selected.created_at)} IST` : ''}>
          {selected && <AnswerDetail submission={selected} />}
        </Modal>
      </main>
    </div>
  )
}

function AnswerDetail({ submission }: { submission: Submission }) {
  const rows = useMemo(() => [...submission.answers].sort((a, b) => a.question_no - b.question_no), [submission])
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted">
        <tr><Th>Q</Th><Th>Question</Th><Th>Answer</Th></tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.question_no} className="border-t align-top">
            <Td>{a.question_no}</Td>
            <td className="min-w-[12rem] px-3 py-2 align-top whitespace-normal">
              {a.text}
              <div className="text-xs text-muted-foreground">Asked as #{a.position} on Day {submission.day}</div>
            </td>
            <Td>{a.label}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>
}
function Td({ children, colSpan }: { children?: React.ReactNode; colSpan?: number }) {
  return <td className="px-3 py-2 whitespace-nowrap" colSpan={colSpan}>{children}</td>
}
