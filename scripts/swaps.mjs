// Parses SWAPING.docx into a map of which option "B" swaps with, per question.
// Key: `${set}-${role}-${qnum}`  ->  'A' | 'C' | 'D'  (the Final position),
// or null when the row says SAME (no change).
import mammoth from 'mammoth'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function loadSwaps(docxPath) {
  const p = docxPath ?? path.resolve(__dirname, '..', 'SWAPING.docx')
  const { value } = await mammoth.extractRawText({ path: p })
  const lines = value.split('\n').map((l) => l.trim()).filter(Boolean)

  const map = new Map()
  let curSet = null
  let curRole = null

  for (const line of lines) {
    // Section header, e.g. "Set-1 MANAGERS & ABOVE" or "Set – 3 OTHERS"
    const sec = line.match(/Set\s*[-–—]?\s*(\d)\s+(MANAGERS?\s*&\s*ABOVE|OTHERS)/i)
    if (sec) {
      curSet = Number(sec[1])
      curRole = /OTHER/i.test(sec[2]) ? 'others' : 'manager'
      continue
    }
    if (/^Que\b/i.test(line)) continue // column header row

    const m = line.match(/^(\d{1,2})\b(.*)$/)
    if (!m || curSet == null) continue
    const qnum = Number(m[1])
    if (qnum < 1 || qnum > 10) continue
    const rest = m[2].toUpperCase()

    let target = null
    if (!/\bSAME\b/.test(rest)) {
      const letters = rest.match(/\b[A-D]\b/g) // e.g. ["B","D"]
      if (letters && letters.length) {
        const last = letters[letters.length - 1]
        if (last !== 'B') target = last // Final position (never B)
      }
    }
    map.set(`${curSet}-${curRole}-${qnum}`, target)
  }
  return map
}
