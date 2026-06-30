import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { MOTIVATIONS, type Answer, type EmployeeForm, type Question, type Role } from '@/lib/types'

type QuizState = { form?: EmployeeForm; role?: Role }

export default function QuizPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { form, role } = (location.state as QuizState) ?? {}

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({})
  const [showBreak, setShowBreak] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!role) return
    supabase
      .from('questions')
      .select('*')
      .eq('role', role)
      .order('set', { ascending: true })
      .order('number', { ascending: true })
      .then(({ data, error }) => {
        if (error) setLoadError(error.message)
        else setQuestions((data as Question[]) ?? [])
        setLoading(false)
      })
  }, [role])

  const total = questions.length
  const question = questions[index]
  const isLast = index === total - 1
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  if (!role || !form) {
    return (
      <Shell>
        <p className="text-muted-foreground">No category selected. Please start from the landing page.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Go to start</Button>
      </Shell>
    )
  }

  if (loading) return <Shell><p className="text-muted-foreground">Loading questions…</p></Shell>
  if (loadError) return <Shell><p className="text-destructive">Failed to load questions: {loadError}</p></Shell>
  if (total === 0) return <Shell><p className="text-muted-foreground">No questions found for this category.</p></Shell>

  if (done) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Thank you! 🎉</h1>
        <p className="mt-2 text-muted-foreground">
          Your responses have been recorded. You may now close this page.
        </p>
        <Button className="mt-6" onClick={() => navigate('/')}>Done</Button>
      </Shell>
    )
  }

  function choose(key: 'A' | 'B' | 'C' | 'D') {
    setAnswers((a) => ({ ...a, [question.id]: key }))
  }

  function next() {
    // motivational break after each set of 10 (but not after the very last)
    const justFinishedSet = (index + 1) % 10 === 0
    if (justFinishedSet && !isLast) {
      setShowBreak(true)
      return
    }
    if (isLast) {
      void submit()
      return
    }
    setIndex((i) => i + 1)
  }

  function continueAfterBreak() {
    setShowBreak(false)
    setIndex((i) => i + 1)
  }

  async function submit() {
    setSubmitting(true)
    setSubmitErr(null)
    const payload: Answer[] = questions.map((q) => ({
      set: q.set,
      question: q.number,
      choice: answers[q.id],
    }))
    const { error } = await supabase.rpc('submit_quiz', {
      p_employee: form,
      p_role: role,
      p_answers: payload,
    })
    setSubmitting(false)
    if (error) {
      setSubmitErr(error.message)
      return
    }
    setDone(true)
  }

  if (showBreak) {
    const setJustDone = Math.ceil((index + 1) / 10) // 1..6
    return (
      <Shell>
        <p className="text-4xl">{MOTIVATIONS[setJustDone - 1]?.match(/\p{Emoji}/u)?.[0] ?? '✨'}</p>
        <h2 className="mt-3 text-xl font-semibold">{MOTIVATIONS[setJustDone - 1]}</h2>
        <p className="mt-2 text-muted-foreground">{setJustDone * 10} of {total} questions complete.</p>
        <Button className="mt-6" onClick={continueAfterBreak}>Continue</Button>
      </Shell>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{role === 'manager' ? 'Manager & Above' : 'Others'} · {question.section}</span>
          <span>Question {index + 1} of {total}</span>
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>

        <h2 className="mt-6 text-lg font-medium">{question.text}</h2>

        <div className="mt-4 space-y-2">
          {question.options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => choose(o.key)}
              className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm hover:bg-accent ${
                answers[question.id] === o.key ? 'border-primary bg-accent' : ''
              }`}
            >
              <span className="font-semibold">{o.key}.</span>
              <span>{o.text}</span>
            </button>
          ))}
        </div>

        {submitErr && <p className="mt-4 text-sm text-destructive">Could not submit: {submitErr}</p>}

        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{answeredCount}/{total} answered</span>
          <Button disabled={!answers[question.id] || submitting} onClick={next}>
            {submitting ? 'Submitting…' : isLast ? 'Submit' : 'Next'}
          </Button>
        </div>
      </main>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">{children}</main>
    </div>
  )
}
