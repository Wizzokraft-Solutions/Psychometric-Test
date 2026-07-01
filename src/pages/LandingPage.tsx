import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ChevronRight, UserRound, Briefcase, CheckCircle2 } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Employee, EmployeeForm, Role } from '@/lib/types'
import { mockEmployees } from '@/lib/mockData'

const EMPTY_FORM: EmployeeForm = {
  emp_no: '', name: '', dob: '', designation: '', department: '', boss: '', tenure: '',
}
const REQUIRED: (keyof EmployeeForm)[] = ['dob', 'designation', 'department', 'boss', 'tenure']
const today = new Date().toISOString().slice(0, 10)

export default function LandingPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [usingMock, setUsingMock] = useState(true)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM)
  const [selected, setSelected] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)

  useEffect(() => {
    supabase.from('employees').select('emp_no,name').then(({ data }) => {
      if (data && data.length > 0) { setEmployees(data as Employee[]); setUsingMock(false) }
    })
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => e.name.toLowerCase().includes(q) || e.emp_no.toLowerCase().includes(q))
  }, [query, employees])

  const missing = useMemo(() => REQUIRED.filter((k) => !form[k].trim()), [form])
  const dobInFuture = !!form.dob && form.dob > today
  const formValid = missing.length === 0 && !dobInFuture
  const canStart = !!selected && !!role && formValid && !alreadyDone

  function pick(e: Employee) {
    setSelected(e.emp_no)
    setForm((f) => ({ ...f, emp_no: e.emp_no, name: e.name }))
    setAttempted(false)
    setAlreadyDone(false)
    // pre-check: has this employee already completed the assessment?
    supabase.rpc('has_submitted', { p_emp_no: e.emp_no }).then(({ data }) => {
      if (data === true) setAlreadyDone(true)
    })
    setTimeout(() => document.getElementById('details')?.scrollIntoView({ behavior: 'smooth' }), 80)
  }
  function set<K extends keyof EmployeeForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function startQuiz() {
    if (!role || !formValid) { setAttempted(true); return }
    if (!canStart) return
    navigate('/quiz', { state: { form, role } })
  }

  return (
    <div className="app-bg min-h-svh">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="brand-gradient h-2 w-2 rounded-full" /> Wizzokraft Solutions
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            <span className="brand-text-gradient">Psychometric</span> Assessment
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Find your name, confirm your details, and pick your category to begin. It takes about 15–20 minutes.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-8 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
        >
          <label className="text-sm font-semibold">1. Find your name / Employee ID</label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or ID…"
              className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
          </div>
          <ul className="mt-3 max-h-60 space-y-1.5 overflow-auto pr-1">
            {results.map((e) => (
              <li key={e.emp_no}>
                <button
                  type="button" onClick={() => pick(e)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-all hover:-translate-y-px hover:shadow-sm ${
                    selected === e.emp_no ? 'border-primary/60 bg-accent brand-ring' : 'hover:border-primary/30'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="brand-gradient flex size-7 items-center justify-center rounded-full text-xs font-bold text-white">
                      {e.name.charAt(0)}
                    </span>
                    {e.name}
                  </span>
                  <span className="text-muted-foreground">{e.emp_no}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-1 py-2 text-sm text-muted-foreground">No matches.</li>}
          </ul>
          {usingMock && <p className="mt-2 text-xs text-muted-foreground">Placeholder list — your real employee list appears here once uploaded.</p>}
        </motion.section>

        {selected && (
          <motion.section
            id="details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            className="mt-6 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          >
            {alreadyDone && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-accent px-3 py-2 text-sm">
                <CheckCircle2 className="size-4 text-brand-green" />
                You’ve already completed this assessment. Thank you!
              </div>
            )}
            <label className="text-sm font-semibold">2. Confirm your details — {form.name}</label>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emp No." value={form.emp_no} readOnly />
              <Field label="Name" value={form.name} readOnly />
              <Field label="Date of Birth" type="date" max={today} value={form.dob} onChange={(v) => set('dob', v)}
                error={attempted && !form.dob ? 'Required' : dobInFuture ? 'Cannot be in the future' : ''} />
              <Field label="Designation" value={form.designation} onChange={(v) => set('designation', v)}
                error={attempted && !form.designation.trim() ? 'Required' : ''} />
              <Field label="Department" value={form.department} onChange={(v) => set('department', v)}
                error={attempted && !form.department.trim() ? 'Required' : ''} />
              <Field label="Reporting Boss Name" value={form.boss} onChange={(v) => set('boss', v)}
                error={attempted && !form.boss.trim() ? 'Required' : ''} />
              <Field label="Months / Years in Current Job" value={form.tenure} onChange={(v) => set('tenure', v)}
                error={attempted && !form.tenure.trim() ? 'Required' : ''} />
            </div>

            <label className="mt-6 block text-sm font-semibold">3. Select your category</label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <RoleCard active={role === 'manager'} onClick={() => setRole('manager')}
                icon={<Briefcase className="size-5" />} title="Manager & Above" desc="Leadership-level assessment" />
              <RoleCard active={role === 'others'} onClick={() => setRole('others')}
                icon={<UserRound className="size-5" />} title="Others" desc="Individual contributor assessment" />
            </div>
            {attempted && !role && <p className="mt-2 text-xs text-destructive">Please pick a category.</p>}

            <Button size="lg" className="mt-6 w-full sm:w-auto" disabled={alreadyDone} onClick={startQuiz}>
              Start Test <ChevronRight className="size-4" />
            </Button>
            {attempted && !formValid && !alreadyDone && (
              <p className="mt-2 text-xs text-destructive">Please complete all required fields above.</p>
            )}
          </motion.section>
        )}
      </main>
    </div>
  )
}

function RoleCard({ active, onClick, icon, title, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active ? 'border-primary bg-accent brand-ring' : 'hover:border-primary/40'
      }`}>
      <span className={`flex size-10 items-center justify-center rounded-lg ${active ? 'brand-gradient text-white' : 'bg-muted text-muted-foreground'}`}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  )
}

function Field({ label, type = 'text', value, readOnly, onChange, error, max }: {
  label: string; type?: string; value: string; readOnly?: boolean; onChange?: (v: string) => void; error?: string; max?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type} value={value} readOnly={readOnly} max={max}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 read-only:bg-muted read-only:text-muted-foreground ${
          error ? 'border-destructive' : ''
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
