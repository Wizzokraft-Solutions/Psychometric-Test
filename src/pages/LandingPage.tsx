import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { mockEmployees, type Employee, type Role } from '@/lib/mockData'

export default function LandingPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [role, setRole] = useState<Role | null>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mockEmployees
    return mockEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) || e.empNo.toLowerCase().includes(q),
    )
  }, [query])

  function startQuiz() {
    if (!selected || !role) return
    // TODO: persist selection + form to Supabase (Phase 0d/3)
    navigate('/quiz', { state: { employee: selected, role } })
  }

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="mt-1 text-muted-foreground">
          Find your name below, fill in your details, and choose your category to begin.
        </p>

        {/* Employee search + select */}
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
              <li key={e.empNo}>
                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${
                    selected?.empNo === e.empNo ? 'bg-accent' : ''
                  }`}
                >
                  <span>{e.name}</span>
                  <span className="text-muted-foreground">{e.empNo}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
            )}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            (Placeholder list — real employee list loads later.)
          </p>
        </section>

        {/* GEN DATA form (fields from Report Format.xlsx) */}
        {selected && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Your details — {selected.name}</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Emp No." value={selected.empNo} readOnly />
              <Field label="Name" value={selected.name} readOnly />
              <Field label="Date of Birth" type="date" />
              <Field label="Designation" />
              <Field label="Department" />
              <Field label="Reporting Boss Name" />
              <Field label="Months / Years in Current Job" />
            </div>

            {/* Role selector */}
            <h2 className="mt-8 text-lg font-semibold">Select your category</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                variant={role === 'manager' ? 'default' : 'outline'}
                onClick={() => setRole('manager')}
              >
                Manager &amp; Above
              </Button>
              <Button
                variant={role === 'others' ? 'default' : 'outline'}
                onClick={() => setRole('others')}
              >
                Others
              </Button>
            </div>

            <div className="mt-8">
              <Button disabled={!role} onClick={startQuiz}>
                Start Test
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function Field({
  label,
  type = 'text',
  value,
  readOnly,
}: {
  label: string
  type?: string
  value?: string
  readOnly?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        defaultValue={value}
        readOnly={readOnly}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 read-only:bg-muted read-only:text-muted-foreground"
      />
    </div>
  )
}
