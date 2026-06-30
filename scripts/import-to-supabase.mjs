// Loads parsed content (./content/*.json) into Supabase.
// Re-runnable: clears each content table, then inserts fresh.
//
// Prereqs:
//   1. Run the schema first (supabase/schema.sql) in the Supabase SQL Editor.
//   2. Create .env (gitignored) with:
//        SUPABASE_URL=https://xxxx.supabase.co
//        SUPABASE_SERVICE_KEY=<service_role / secret key>
//   3. node --env-file=.env scripts/import-to-supabase.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT = path.resolve(__dirname, '..', 'content')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Run with: node --env-file=.env scripts/import-to-supabase.mjs')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })
const read = (f) => JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'))

async function replace(table, rows) {
  // clear existing, then insert fresh (idempotent re-runs)
  const del = await db.from(table).delete().not('set', 'is', null)
  if (del.error) throw new Error(`${table} clear: ${del.error.message}`)
  // insert in chunks to stay well under payload limits
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const ins = await db.from(table).insert(chunk)
    if (ins.error) throw new Error(`${table} insert: ${ins.error.message}`)
  }
  console.log(`  ${table}: ${rows.length} rows`)
}

async function main() {
  console.log('Importing content into Supabase…')

  const questions = read('questions.json').map((q) => ({
    set: q.set, section: q.section, role: q.role, number: q.number, text: q.text, options: q.options,
  }))
  const keys = read('answer-keys.json').map((k) => ({
    set: k.set, role: k.role, question: k.question, points: k.points,
  }))
  const interp = read('interpretations.json').map((i) => ({
    set: i.set, section: i.section, role: i.role, min: i.min ?? 0, max: i.max ?? 9999, label: i.label, text: i.text,
  }))

  await replace('questions', questions)
  await replace('answer_keys', keys)
  await replace('interpretations', interp)

  console.log('Done. ✅')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
