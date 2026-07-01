// Rewrites the SCORE sheet of every Ans-*.xlsx to match the swapped scoring
// in content/answer-keys.json (run parse-content first). Idempotent.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SETS = [
  { n: 1, folder: 'Technical Skills (Set 1)' },
  { n: 2, folder: 'Problem Solving Skills (Set 2)' },
  { n: 3, folder: 'Communication Skills (Set 3)' },
  { n: 4, folder: 'Team Work & Collaboration Skills (Set - 4)' },
  { n: 5, folder: 'Customer Focus (Set 5)' },
  { n: 6, folder: 'Learning Agility (Set 6)' },
]
const ROLES = [
  { role: 'manager', re: /^Ans-.*Managers?\s*&\s*Above\.xlsx$/i },
  { role: 'others', re: /^Ans-.*Others\.xlsx$/i },
]

const keys = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'answer-keys.json'), 'utf8'))
const keyOf = new Map(keys.map((k) => [`${k.set}-${k.role}-${k.question}`, k.points]))
const findFile = (dir, re) => {
  const h = fs.readdirSync(dir).find((f) => re.test(f))
  if (!h) throw new Error(`No file for ${re} in ${dir}`)
  return path.join(dir, h)
}

for (const set of SETS) {
  const dir = path.join(ROOT, set.folder)
  for (const { role, re } of ROLES) {
    const p = findFile(dir, re)
    const wb = XLSX.readFile(p)
    const scoreName = wb.SheetNames.find((s) => s.toLowerCase().startsWith('score'))
    if (!scoreName) throw new Error(`No SCORE sheet in ${p}`)

    const aoa = [['Question', 'A', 'B', 'C', 'D']]
    for (let q = 1; q <= 10; q++) {
      const pts = keyOf.get(`${set.n}-${role}-${q}`)
      aoa.push([q, pts.A, pts.B, pts.C, pts.D])
    }
    wb.Sheets[scoreName] = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.writeFile(wb, p)
    console.log('updated SCORE in', path.basename(p))
  }
}
console.log('Done — 12 scoring sheets rewritten to the swapped scores. ✅')
