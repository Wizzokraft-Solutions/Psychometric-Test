import { useState } from 'react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { SECTIONS } from '@/lib/mockData'

// Mock report rows for the shell. Real data comes from Supabase later.
const mockSegment = [
  { dept: 'Engineering', boss: 'Rohan Mehta', employees: ['Aarav Sharma', 'Diya Patel'] },
  { dept: 'Sales', boss: 'Priya Singh', employees: ['Vivaan Reddy'] },
]

const mockMaster = [
  { empNo: 'WZ001', name: 'Aarav Sharma', dept: 'Engineering', boss: 'Rohan Mehta', scores: [42, 38, 45, 40, 36, 41] },
  { empNo: 'WZ002', name: 'Diya Patel', dept: 'Engineering', boss: 'Rohan Mehta', scores: [30, 33, 28, 35, 31, 29] },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [tab, setTab] = useState<'manager' | 'others'>('manager')

  if (!authed) {
    return (
      <div className="min-h-svh bg-background">
        <Header />
        <main className="mx-auto max-w-sm px-4 py-16">
          <h1 className="text-xl font-bold">Admin access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the admin password to view reports.
          </p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password"
            className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          {/* TODO: replace mock gate with real auth (Phase 4) */}
          <Button className="mt-3 w-full" onClick={() => setAuthed(true)}>
            Enter
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            (Placeholder gate — any value works for now.)
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Reports</h1>

        {/* Role tabs */}
        <div className="mt-4 flex gap-2">
          <Button variant={tab === 'manager' ? 'default' : 'outline'} size="sm" onClick={() => setTab('manager')}>
            Manager &amp; Above
          </Button>
          <Button variant={tab === 'others' ? 'default' : 'outline'} size="sm" onClick={() => setTab('others')}>
            Others
          </Button>
        </div>

        {/* Segment report */}
        <h2 className="mt-8 text-lg font-semibold">Employees per Boss</h2>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <Th>S.No.</Th>
                <Th>Department</Th>
                <Th>Reporting Boss</Th>
                <Th>Employees</Th>
              </tr>
            </thead>
            <tbody>
              {mockSegment.map((r, i) => (
                <tr key={r.boss} className="border-t">
                  <Td>{i + 1}</Td>
                  <Td>{r.dept}</Td>
                  <Td>{r.boss}</Td>
                  <Td>{r.employees.join(', ')} ({r.employees.length})</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Master report */}
        <h2 className="mt-8 text-lg font-semibold">Master Report</h2>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <Th>Emp No.</Th>
                <Th>Name</Th>
                <Th>Department</Th>
                <Th>Reporting Boss</Th>
                {SECTIONS.map((s) => (
                  <Th key={s}>{s}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockMaster.map((r) => (
                <tr key={r.empNo} className="border-t">
                  <Td>{r.empNo}</Td>
                  <Td>{r.name}</Td>
                  <Td>{r.dept}</Td>
                  <Td>{r.boss}</Td>
                  {r.scores.map((sc, i) => (
                    <Td key={i}>{sc}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          (Placeholder reports — real data, interpretations, per-employee drill-down and
          answer-detail popup load once Supabase is wired.)
        </p>
      </main>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 whitespace-nowrap">{children}</td>
}
