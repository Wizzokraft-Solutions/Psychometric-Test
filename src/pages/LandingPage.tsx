import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Employee, EmployeeForm, Role } from '@/lib/types'
import { mockEmployees } from '@/lib/mockData'

const EMPTY_FORM: EmployeeForm = {
  emp_no: '', name: '', dob: '', designation: '', department: '', boss: '', tenure: '',
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [usingMock, setUsingMock] = useState(true)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM)
  const [selected, setSelected] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    supabase
      .from('employees')
      .select('emp_no,name')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEmployees(data as Employee[])
          setUsingMock(false)
        }
      })
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.emp_no.toLowerCase().includes(q),
    )
  }, [query, employees])

  function pick(e: Employee) {
    setSelected(e.emp_no)
    setForm((f) => ({ ...f, emp_no: e.emp_no, name: e.name }))
  }

  function set<K extends keyof EmployeeForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function startQuiz() {
    if (!selected || !role) return
    navigate('/quiz', { state: { form, role } })
  }

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="mt-1 text-muted-foreground">
          Find your name below, fill in your details, and choose your category to begin.
        </p>

        <section className="mt-6">
          <label className="text-sm font-medium">Find your name / Employee ID</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ID…"
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <ul className="mt-2 max-h-56 divide-y overflow-auto rounded-md border">
            {results.map((e) => (
              <li key={e.emp_no}>
                <button
                  type="button"
                  onClick={() => pick(e)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${
                    selected === e.emp_no ? 'bg-accent' : ''
                  }`}
                >
                  <span>{e.name}</span>
                  <span className="text-muted-foreground">{e.emp_no}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
            )}
          </ul>
          {usingMock && (
            <p className="mt-1 text-xs text-muted-foreground">
              (Placeholder list — real employee list loads once uploaded.)
            </p>
          )}
        </section>

        {selected && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Your details — {form.name}</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emp No." value={form.emp_no} readOnly />
              <Field label="Name" value={form.name} readOnly />
              <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} />
              <Field label="Designation" value={form.designation} onChange={(v) => set('designation', v)} />
              <Field label="Department" value={form.department} onChange={(v) => set('department', v)} />
              <Field label="Reporting Boss Name" value={form.boss} onChange={(v) => set('boss', v)} />
              <Field label="Months / Years in Current Job" value={form.tenure} onChange={(v) => set('tenure', v)} />
            </div>

            <h2 className="mt-8 text-lg font-semibold">Select your category</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button variant={role === 'manager' ? 'default' : 'outline'} onClick={() => setRole('manager')}>
                Manager &amp; Above
              </Button>
              <Button variant={role === 'others' ? 'default' : 'outline'} onClick={() => setRole('others')}>
                Others
              </Button>
            </div>

            <div className="mt-8">
              <Button disabled={!role} onClick={startQuiz}>Start Test</Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function Field({
  label, type = 'text', value, readOnly, onChange,
}: {
  label: string
  type?: string
  value: string
  readOnly?: boolean
  onChange?: (v: string) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 read-only:bg-muted read-only:text-muted-foreground"
      />
    </div>
  )
}
