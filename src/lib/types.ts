// A question as asked on the open day.
//   position    = order shown that day
//   question_no = number in DAY 1 (stable across days)
export type SurveyQuestion = { position: number; question_no: number; text: string }

// Result of the get_survey RPC. day is null when the test is closed.
export type Survey = { day: number | null; questions: SurveyQuestion[] }

// Details the person enters before the test. Name + DOB identify them.
export type PersonForm = {
  name: string
  dob: string
  designation: string
  department: string
}

export type AnswerValue = 1 | 2 | 3 | 4 | 5

// Highest agreement first, as shown to the user.
export const SCALE: { value: AnswerValue; label: string }[] = [
  { value: 5, label: 'Highly Agree' },
  { value: 4, label: 'Slightly Agree' },
  { value: 3, label: 'Neutral' },
  { value: 2, label: 'Disagree' },
  { value: 1, label: 'Highly Disagree' },
]

// Answer as stored on a submission (snapshot of the question text at submit time).
export type StoredAnswer = {
  question_no: number
  position: number
  text: string
  value: AnswerValue
  label: string
}

export type Submission = {
  id: string
  created_at: string
  day: number
  name: string
  dob: string
  designation: string | null
  department: string | null
  answers: StoredAnswer[]
}

export type AdminData = {
  active_day: number | null
  questions: { question_no: number; text: string }[]
  submissions: Submission[]
}

// Shown after every 10 questions.
export const MOTIVATIONS = [
  'Great start — keep the momentum going! 🚀',
  'Two-thirds done — finish strong! 🔥',
]
