// Loads the employee master list (Employee Number + Full Name only) into Supabase.
// Ignores all other columns (emails, salary, reporting lines) so no extra PII is stored.
//
//   node --env-file=.env scripts/import-employees.mjs "<path-to-csv>"
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node --env-file=.env scripts/import-employees.mjs "<path-to-csv>"')
  process.exit(1)
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY (run with --env-file=.env)')
  process.exit(1)
}

const abs = path.isAbsolute(csvPath) ? csvPath : path.resolve(__dirname, '..', csvPath)
const wb = XLSX.readFile(abs, { raw: true })
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false })

// The real header row is wherever "Employee Number" appears (file has title rows above it).
const hIdx = rows.findIndex((r) => Array.isArray(r) && r.some((c) => String(c).trim() === 'Employee Number'))
if (hIdx === -1) { console.error('Could not find an "Employee Number" header row.'); process.exit(1) }
const header = rows[hIdx].map((c) => String(c).trim())
const empCol = header.indexOf('Employee Number')
const nameCol = header.indexOf('Full Name')
if (empCol === -1 || nameCol === -1) { console.error('Missing "Employee Number" or "Full Name" column.'); process.exit(1) }

const seen = new Set()
const employees = []
for (const r of rows.slice(hIdx + 1)) {
  const emp_no = String(r[empCol] ?? '').trim()
  const name = String(r[nameCol] ?? '').trim()
  if (!emp_no || !name || seen.has(emp_no)) continue
  seen.add(emp_no)
  employees.push({ emp_no, name })
}
console.log(`Parsed ${employees.length} employees.`)

const db = createClient(url, key, { auth: { persistSession: false } })
const del = await db.from('employees').delete().neq('emp_no', '')
if (del.error) { console.error('clear error:', del.error.message); process.exit(1) }
for (let i = 0; i < employees.length; i += 200) {
  const chunk = employees.slice(i, i + 200)
  const ins = await db.from('employees').insert(chunk)
  if (ins.error) { console.error('insert error:', ins.error.message); process.exit(1) }
}
console.log(`Imported ${employees.length} employees into Supabase. ✅`)
