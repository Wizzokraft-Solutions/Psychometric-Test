// Parses the 6 sets' Word (questions) + Excel (scoring + interpretation) files
// into verified JSON under ./content (gitignored — contains answer keys).
//
// Run: node scripts/parse-content.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mammoth from 'mammoth'
import xlsx from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'content')

const SETS = [
  { n: 1, section: 'Technical Skills', folder: 'Technical Skills (Set 1)' },
  { n: 2, section: 'Problem Solving Skills', folder: 'Problem Solving Skills (Set 2)' },
  { n: 3, section: 'Communication Skills', folder: 'Communication Skills (Set 3)' },
  { n: 4, section: 'Team Work & Collaboration Skills', folder: 'Team Work & Collaboration Skills (Set - 4)' },
  { n: 5, section: 'Customer Focus', folder: 'Customer Focus (Set 5)' },
  { n: 6, section: 'Learning Agility', folder: 'Learning Agility (Set 6)' },
]

const ROLES = [
  { role: 'manager', queRe: /^Que-.*Managers?\s*&\s*Above\.docx$/i, ansRe: /^Ans-.*Managers?\s*&\s*Above\.xlsx$/i },
  { role: 'others', queRe: /^Que-.*Others\.docx$/i, ansRe: /^Ans-.*Others\.xlsx$/i },
]

function findFile(dir, re) {
  const hit = fs.readdirSync(dir).find((f) => re.test(f))
  if (!hit) throw new Error(`No file matching ${re} in ${dir}`)
  return path.join(dir, hit)
}

async function parseQuestions(docxPath) {
  const { value } = await mammoth.extractRawText({ path: docxPath })
  const lines = value.split('\n').map((l) => l.trim()).filter(Boolean)
  const questions = []
  let cur = null
  let inOptions = false
  for (const line of lines) {
    const qm = line.match(/^Question\s+(\d+)/i)
    if (qm) {
      if (cur) questions.push(cur)
      cur = { number: Number(qm[1]), text: '', options: [] }
      inOptions = false
      continue
    }
    if (!cur) continue // skip instructions / "SET - N" header before Q1
    const om = line.match(/^([A-D])[.)]\s*(.+)$/)
    if (om) {
      cur.options.push({ key: om[1], text: om[2].trim() })
      inOptions = true
      continue
    }
    if (inOptions && cur.options.length) {
      // continuation of a wrapped option
      cur.options[cur.options.length - 1].text += ' ' + line
    } else {
      // continuation of the question stem
      cur.text = cur.text ? cur.text + ' ' + line : line
    }
  }
  if (cur) questions.push(cur)
  return questions
}

function sheet(wb, name) {
  // Match by prefix so "SCORE" also matches "SCORES", "INTERPRETATION" matches "INTERPRETATIONS", etc.
  const want = name.toLowerCase()
  const key =
    wb.SheetNames.find((s) => s.toLowerCase() === want) ||
    wb.SheetNames.find((s) => s.toLowerCase().startsWith(want))
  if (!key) throw new Error(`Sheet "${name}" not found (have: ${wb.SheetNames.join(', ')})`)
  return xlsx.utils.sheet_to_json(wb.Sheets[key], { header: 1, blankrows: false })
}

function parseBand(raw) {
  const s = String(raw).trim()
  let m
  if ((m = s.match(/^Below\s+(\d+)/i))) return { min: 0, max: Number(m[1]) - 1 }
  if ((m = s.match(/^(\d+)\s*(?:\+|and\s+above|&\s+above)/i))) return { min: Number(m[1]), max: 9999 }
  if ((m = s.match(/^(\d+)\s*[–—-]\s*(\d+)/))) return { min: Number(m[1]), max: Number(m[2]) }
  return null
}

function parseAnswers(xlsxPath) {
  const wb = xlsx.readFile(xlsxPath)
  const scoreRows = sheet(wb, 'SCORE').slice(1) // drop header
  const points = {}
  for (const r of scoreRows) {
    if (r[0] == null || r[0] === '') continue
    points[Number(r[0])] = { A: Number(r[1]), B: Number(r[2]), C: Number(r[3]), D: Number(r[4]) }
  }
  const interpRows = sheet(wb, 'INTERPRETATION').slice(1)
  const interpretations = []
  for (const r of interpRows) {
    if (r[0] == null || r[0] === '') continue
    const band = parseBand(r[0])
    interpretations.push({ label: String(r[0]).trim(), ...(band ?? {}), text: String(r[1] ?? '').trim() })
  }
  return { points, interpretations }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const allQuestions = []
  const allKeys = []
  const allInterp = []
  const warnings = []
  const summary = []
  const maxPos = { A: 0, B: 0, C: 0, D: 0 } // where the top score lands

  // NOTE: the source .docx/.xlsx are already in the swapped order (SWAPING.docx
  // was applied to them once, via scripts/swap-source-*.mjs). This parser just
  // reads them as-is — do NOT re-apply the swap here or it would double-apply.
  for (const set of SETS) {
    const dir = path.join(ROOT, set.folder)
    for (const { role, queRe, ansRe } of ROLES) {
      const questions = await parseQuestions(findFile(dir, queRe))
      const { points, interpretations } = parseAnswers(findFile(dir, ansRe))

      // validation
      if (questions.length !== 10) warnings.push(`Set ${set.n} ${role}: expected 10 questions, got ${questions.length}`)
      for (const q of questions) {
        if (q.options.length !== 4) warnings.push(`Set ${set.n} ${role} Q${q.number}: expected 4 options, got ${q.options.length}`)
        if (!points[q.number]) warnings.push(`Set ${set.n} ${role} Q${q.number}: no score row in answer key`)
      }

      for (const q of questions) {
        const pts = points[q.number]
        if (pts) {
          const top = ['A', 'B', 'C', 'D'].reduce((m, k) => (pts[k] > pts[m] ? k : m), 'A')
          maxPos[top]++
        }
        allQuestions.push({ set: set.n, section: set.section, role, number: q.number, text: q.text, options: q.options })
        allKeys.push({ set: set.n, role, question: q.number, points: pts ?? null })
      }
      for (const it of interpretations) {
        allInterp.push({ set: set.n, section: set.section, role, ...it })
      }
      summary.push({ set: set.n, role, questions: questions.length, scoreRows: Object.keys(points).length, bands: interpretations.length })
    }
  }

  fs.writeFileSync(path.join(OUT, 'questions.json'), JSON.stringify(allQuestions, null, 2))
  fs.writeFileSync(path.join(OUT, 'answer-keys.json'), JSON.stringify(allKeys, null, 2))
  fs.writeFileSync(path.join(OUT, 'interpretations.json'), JSON.stringify(allInterp, null, 2))

  console.log('Parsed content -> ./content')
  console.table(summary)
  console.log(`Questions: ${allQuestions.length} | Answer-key rows: ${allKeys.length} | Interpretation bands: ${allInterp.length}`)
  console.log(`Top-score position:`, maxPos, '(spread across A/B/C/D = swap is in the sources)')
  if (warnings.length) {
    console.log('\nWARNINGS:')
    warnings.forEach((w) => console.log('  - ' + w))
  } else {
    console.log('\nNo validation warnings. ✅')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
