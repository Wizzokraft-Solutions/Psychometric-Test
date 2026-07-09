export type Role = 'manager' | 'others'

export type Option = { key: 'A' | 'B' | 'C' | 'D'; text: string }

export type Question = {
  id: number
  set: number
  section: string
  role: Role
  number: number
  text: string
  options: Option[]
}

export type Employee = { emp_no: string; name: string }

// GEN DATA form (fields from Report Format.xlsx)
export type EmployeeForm = {
  emp_no: string
  name: string
  dob: string
  designation: string
  department: string
  boss: string
  tenure: string
}

// One answer the user gives
export type Answer = { set: number; question: number; choice: 'A' | 'B' | 'C' | 'D' }

// Answer enriched by the server with awarded points (stored on the submission).
// `text` is a snapshot of the chosen option's text at submit time, so the
// recorded answer never drifts if the question is later edited.
export type ScoredAnswer = Answer & { points: number; section: string; text?: string }

export type Submission = {
  id: string
  created_at: string
  emp_no: string
  name: string
  dob: string | null
  designation: string
  department: string
  boss: string
  tenure: string
  role: Role
  answers: ScoredAnswer[]
  section_scores: Record<string, number>
  interpretations: Record<string, string>
  total: number
}

// Result returned by the submit_quiz RPC
export type QuizResult = {
  id: string
  total: number
  section_scores: Record<string, number>
  interpretations: Record<string, string>
}

export const SECTION_ORDER = [
  'Technical Skills',
  'Problem Solving Skills',
  'Communication Skills',
  'Team Work & Collaboration Skills',
  'Customer Focus',
  'Learning Agility',
] as const

export const MOTIVATIONS = [
  'Great start — keep the momentum going! 🚀',
  "You're a third of the way there. Stay sharp! 💪",
  'Halfway done — you’re doing brilliantly! 🌟',
  'Two-thirds in. Keep it up! 🔥',
  'Almost there — finish strong! 🏁',
  'Last stretch — you’ve got this! 🎉',
]
