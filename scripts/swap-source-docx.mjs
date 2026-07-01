// Rewrites each Que-*.docx so the on-page option order matches the swapped
// content in content/questions.json (run parse-content first). Idempotent.
// Each option is a single run "X. body"; we only rewrite the body, keep the label.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import mammoth from 'mammoth'

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
  { role: 'manager', re: /^Que-.*Managers?\s*&\s*Above\.docx$/i },
  { role: 'others', re: /^Que-.*Others\.docx$/i },
]

const questions = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'questions.json'), 'utf8'))
const enc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const findFile = (dir, re) => {
  const h = fs.readdirSync(dir).find((f) => re.test(f))
  if (!h) throw new Error(`No file for ${re} in ${dir}`)
  return path.join(dir, h)
}

let totalMismatch = 0
for (const set of SETS) {
  const dir = path.join(ROOT, set.folder)
  for (const { role, re } of ROLES) {
    const p = findFile(dir, re)
    const opt = new Map() // `${qnum}-${letter}` -> body
    for (const q of questions.filter((q) => q.set === set.n && q.role === role))
      for (const o of q.options) opt.set(`${q.number}-${o.key}`, o.text)

    const buf = fs.readFileSync(p)
    const zip = await JSZip.loadAsync(buf)
    const xml = await zip.file('word/document.xml').async('string')

    // Work per paragraph so options split across multiple runs are handled:
    // put the full "X. body" in the first <w:t>, empty any following <w:t>.
    let curQ = null
    const out = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (para) => {
      const combined = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((x) => dec(x[1])).join('')
      const qm = combined.match(/^Question\s+(\d+)/)
      if (qm) { curQ = Number(qm[1]); return para }
      const om = combined.match(/^([A-D])\.\s?([\s\S]*)$/)
      if (om && curQ != null) {
        const body = opt.get(`${curQ}-${om[1]}`)
        if (body != null) {
          const full = enc(`${om[1]}. ${body}`)
          let first = true
          return para.replace(/(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g, (mm, open, _c, close) => {
            if (first) { first = false; return `${open}${full}${close}` }
            return `${open}${close}`
          })
        }
      }
      return para
    })

    zip.file('word/document.xml', out)
    const nb = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    fs.writeFileSync(p, nb)

    // verify by re-reading
    const { value } = await mammoth.extractRawText({ path: p })
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean)
    let cq = null, mism = 0
    for (const line of lines) {
      const qm = line.match(/^Question\s+(\d+)/)
      if (qm) { cq = Number(qm[1]); continue }
      const om = line.match(/^([A-D])\.\s?(.*)$/)
      if (om && cq != null) {
        const want = opt.get(`${cq}-${om[1]}`)
        if (want != null && om[2].trim() !== want.trim()) mism++
      }
    }
    totalMismatch += mism
    console.log(`${path.basename(p)} — ${mism === 0 ? 'OK ✅' : mism + ' MISMATCHES ❌'}`)
  }
}
console.log(totalMismatch === 0 ? '\nAll question files match the swapped order. ✅' : `\n${totalMismatch} mismatches!`)
process.exit(totalMismatch === 0 ? 0 : 1)
