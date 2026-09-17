import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  MOTIVATIONS, SCALE,
  type AnswerValue, type PersonForm, type Survey, type SurveyQuestion,
} from '@/lib/types'

type QuizState = { form?: PersonForm }

export default function QuizPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { form } = (location.state as QuizState) ?? {}

  const [day, setDay] = useState<number | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({}) // question_no -> value
  const [showBreak, setShowBreak] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'ok' | 'already'>(null)

  useEffect(() => {
    if (!form) return
    supabase.rpc('get_survey').then(({ data, error }) => {
      if (error) setLoadError(error.message)
      else {
        const s = data as Survey
        setDay(s.day)
        setQuestions(s.questions ?? [])
      }
      setLoading(false)
    })
  }, [form])

  const total = questions.length
  const question = questions[index]
  const isLast = index === total - 1
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  if (!form) {
    return <Shell><p className="text-muted-foreground">No details entered. Please start from the landing page.</p>
      <Button className="mt-4" onClick={() => navigate('/')}>Go to start</Button></Shell>
  }
  if (loading) return <Shell><p className="text-muted-foreground">Loading your assessment…</p></Shell>
  if (loadError) return <Shell><p className="text-destructive">Failed to load: {loadError}</p></Shell>
  if (day == null || total === 0) {
    return <Shell><p className="text-muted-foreground">The assessment is not open right now.</p>
      <Button className="mt-4" onClick={() => navigate('/')}>Go to start</Button></Shell>
  }

  if (done) {
    return (
      <Shell>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <PartyPopper className="mx-auto size-14 text-brand-green" />
        </motion.div>
        <h1 className="mt-4 text-3xl font-bold">Thank you! 🎉</h1>
        <p className="mt-2 text-muted-foreground">
          {done === 'already'
            ? 'You have already completed today’s assessment. You may now close this page.'
            : 'Your responses have been recorded. You may now close this page.'}
        </p>
        <Button className="mt-6" onClick={() => navigate('/')}>Done</Button>
      </Shell>
    )
  }

  function choose(value: AnswerValue) {
    setAnswers((a) => ({ ...a, [question.question_no]: value }))
  }
  function next() {
    if (isLast) { void submit(); return }
    if ((index + 1) % 10 === 0) { setShowBreak(true); return }
    setIndex((i) => i + 1)
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1))
  }
  function continueAfterBreak() {
    setShowBreak(false)
    setIndex((i) => i + 1)
  }
  async function submit() {
    setSubmitting(true); setSubmitErr(null)
    const payload = questions.map((q) => ({ question_no: q.question_no, value: answers[q.question_no] }))
    const { error } = await supabase.rpc('submit_survey', { p_person: form, p_answers: payload })
    setSubmitting(false)
    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('already_submitted')) { setDone('already'); return }
      if (msg.includes('invalid_mobile')) { setSubmitErr('Your mobile number is invalid. Please go back and correct it.'); return }
      if (msg.includes('survey_closed')) { setSubmitErr('The assessment was closed before you submitted.'); return }
      setSubmitErr(error.message); return
    }
    setDone('ok')
  }

  if (showBreak) {
    const milestone = Math.ceil((index + 1) / 10)
    const message = MOTIVATIONS[milestone - 1] ?? 'Keep going! ✨'
    return (
      <Shell>
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 12 }}
          className="text-5xl"
        >
          {message.match(/\p{Emoji_Presentation}/u)?.[0] ?? '✨'}
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4 text-2xl font-bold">
          {message}
        </motion.h2>
        <p className="mt-2 text-muted-foreground">{milestone * 10} of {total} questions complete.</p>
        <div className="mx-auto mt-4 h-2 w-56 overflow-hidden rounded-full bg-muted">
          <motion.div className="brand-gradient h-full" initial={{ width: 0 }} animate={{ width: `${(milestone * 10 / total) * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
        <Button className="mt-6" onClick={continueAfterBreak}>Continue <ChevronRight className="size-4" /></Button>
      </Shell>
    )
  }

  const current = answers[question.question_no]

  return (
    <div className="app-bg min-h-svh">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
            <span className="brand-gradient h-2 w-2 rounded-full" />
            Day {day}
          </span>
          <span className="text-muted-foreground">Question {index + 1} of {total}</span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="brand-gradient h-full"
            initial={false}
            animate={{ width: `${((index + 1) / total) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.position}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-6 rounded-2xl border bg-card p-6 shadow-sm"
          >
            <h2 className="text-lg font-medium leading-relaxed">{question.text}</h2>
            <div className="mt-5 space-y-2.5">
              {SCALE.map((o) => {
                const active = current === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    data-testid="option"
                    onClick={() => choose(o.value)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all hover:-translate-y-px ${
                      active ? 'border-primary bg-accent brand-ring' : 'hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      active ? 'brand-gradient text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {active && <Check className="size-4" />}
                    </span>
                    <span>{o.label}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {submitErr && <p className="mt-4 text-sm text-destructive">Could not submit: {submitErr}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button size="lg" variant="outline" disabled={index === 0 || submitting} onClick={prev}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">{answeredCount}/{total} answered</span>
          <Button size="lg" disabled={!current || submitting} onClick={next}>
            {submitting ? 'Submitting…' : isLast ? 'Submit' : 'Next'}
            {!submitting && <ChevronRight className="size-4" />}
          </Button>
        </div>
      </main>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-bg min-h-svh">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">{children}</main>
    </div>
  )
}
