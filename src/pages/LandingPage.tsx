import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { PersonForm, Survey } from '@/lib/types'

const EMPTY_FORM: PersonForm = { name: '', mobile: '', dob: '', designation: '', department: '' }
const REQUIRED: (keyof PersonForm)[] = ['name', 'mobile', 'dob', 'designation', 'department']

// Digits only, minus a leading +91 / 0. Mirrors the check in submit_survey.
function normalizeMobile(raw: string) {
  return raw.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')
}
const isValidMobile = (raw: string) => /^[6-9]\d{9}$/.test(normalizeMobile(raw))
const today = new Date().toISOString().slice(0, 10)

export default function LandingPage() {
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<PersonForm>(EMPTY_FORM)
  const [attempted, setAttempted] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    supabase.rpc('get_survey').then(({ data, error }) => {
      if (error) setLoadError(error.message)
      else setSurvey(data as Survey)
    })
  }, [])

  const missing = useMemo(() => REQUIRED.filter((k) => !form[k].trim()), [form])
  const dobInFuture = !!form.dob && form.dob > today
  const mobileInvalid = !!form.mobile.trim() && !isValidMobile(form.mobile)
  const formValid = missing.length === 0 && !dobInFuture && !mobileInvalid

  function set<K extends keyof PersonForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (key === 'name' || key === 'dob') setAlreadyDone(false)
  }

  async function startQuiz() {
    if (!formValid) { setAttempted(true); return }
    setChecking(true)
    const { data } = await supabase.rpc('has_submitted_survey', { p_name: form.name.trim(), p_dob: form.dob })
    setChecking(false)
    if (data === true) { setAlreadyDone(true); return }
    navigate('/quiz', { state: { form: { ...form, mobile: normalizeMobile(form.mobile) } } })
  }

  const closed = survey && survey.day == null

  return (
    <div className="app-bg min-h-svh">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="brand-gradient h-2 w-2 rounded-full" /> Wizzokraft Solutions
            {survey?.day != null && <> · Day {survey.day}</>}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            <span className="brand-text-gradient">Self</span> Assessment
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Fill in your details to begin. It takes about 5–10 minutes.
          </p>
        </motion.div>

        {loadError && <p className="mt-8 text-sm text-destructive">Could not load the assessment: {loadError}</p>}
        {!survey && !loadError && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

        {closed && (
          <motion.section
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
            className="mt-8 flex items-center gap-3 rounded-2xl border bg-card p-5 shadow-sm"
          >
            <Clock className="size-5 text-muted-foreground" />
            <p className="text-sm">The assessment is not open right now. Please check back later.</p>
          </motion.section>
        )}

        {survey?.day != null && (
          <motion.section
            id="details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}
            className="mt-8 rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
          >
            <label className="text-sm font-semibold">Your details</label>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(v) => set('name', v)} required
                error={attempted && !form.name.trim() ? 'Required' : ''} />
              <Field label="Mobile Number" type="tel" inputMode="numeric" autoComplete="tel" value={form.mobile}
                onChange={(v) => set('mobile', v)} required placeholder="10-digit mobile number"
                error={attempted && !form.mobile.trim() ? 'Required' : attempted && mobileInvalid ? 'Enter a valid 10-digit mobile number' : ''} />
              <Field label="Date of Birth" type="date" max={today} value={form.dob} onChange={(v) => set('dob', v)} required
                error={attempted && !form.dob ? 'Required' : dobInFuture ? 'Cannot be in the future' : ''} />
              <Field label="Designation" value={form.designation} onChange={(v) => set('designation', v)} required
                error={attempted && !form.designation.trim() ? 'Required' : ''} />
              <Field label="Department" value={form.department} onChange={(v) => set('department', v)} required
                error={attempted && !form.department.trim() ? 'Required' : ''} />
            </div>

            {alreadyDone && (
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-primary/40 bg-accent px-3 py-2 text-sm">
                <CheckCircle2 className="size-4 text-brand-green" />
                You have already completed today’s assessment. Thank you!
              </div>
            )}

            <Button size="lg" className="mt-6 w-full sm:w-auto" disabled={alreadyDone || checking} onClick={startQuiz}>
              {checking ? 'Checking…' : 'Start Test'} <ChevronRight className="size-4" />
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

function Field({ label, type = 'text', value, onChange, error, max, required, placeholder, inputMode, autoComplete }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; error?: string; max?: string; required?: boolean
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string
}) {
  const id = 'f-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={id} type={type} value={value} max={max} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 ${
          error ? 'border-destructive' : ''
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
