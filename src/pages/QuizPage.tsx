import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { mockQuestions, type Employee, type Role } from '@/lib/mockData'

type QuizState = { employee?: Employee; role?: Role }

export default function QuizPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as QuizState) ?? {}

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const question = mockQuestions[index]
  const total = mockQuestions.length
  const isLast = index === total - 1

  function choose(key: string) {
    setAnswers((a) => ({ ...a, [question.id]: key }))
  }

  function next() {
    if (isLast) {
      // TODO: send answers to Supabase for server-side scoring (Phase 3)
      setSubmitted(true)
      return
    }
    setIndex((i) => i + 1)
  }

  if (!state.role) {
    return (
      <div className="min-h-svh bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground">
            No category selected. Please start from the landing page.
          </p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Go to start
          </Button>
        </main>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-svh bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Thank you! 🎉</h1>
          <p className="mt-2 text-muted-foreground">
            Your responses have been recorded. (Scoring is handled server-side later.)
          </p>
          <Button className="mt-6" onClick={() => navigate('/')}>
            Done
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {state.role === 'manager' ? 'Manager & Above' : 'Others'} · {question.section}
          </span>
          <span>
            Question {index + 1} of {total}
          </span>
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
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

        <div className="mt-6 flex justify-end">
          <Button disabled={!answers[question.id]} onClick={next}>
            {isLast ? 'Submit' : 'Next'}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          (Placeholder quiz — full 60-question set loads once content import is wired.)
        </p>
      </main>
    </div>
  )
}
