// Placeholder data for Phase 0c UI shells.
// Replace `mockEmployees` with the real master list (arriving ~2026-07-02),
// and replace `mockQuestions` once the content import (Phase 1 / Supabase) is wired.

export type Employee = {
  empNo: string
  name: string
}

export const mockEmployees: Employee[] = [
  { empNo: 'WZ001', name: 'Aarav Sharma' },
  { empNo: 'WZ002', name: 'Diya Patel' },
  { empNo: 'WZ003', name: 'Vivaan Reddy' },
  { empNo: 'WZ004', name: 'Ananya Iyer' },
  { empNo: 'WZ005', name: 'Kabir Nair' },
  { empNo: 'WZ006', name: 'Ishaan Gupta' },
]

export type Role = 'manager' | 'others'

export const SECTIONS = [
  'Technical Skills',
  'Problem Solving Skills',
  'Communication Skills',
  'Team Work & Collaboration Skills',
  'Customer Focus',
  'Learning Agility',
] as const

export type MockQuestion = {
  id: number
  section: string
  text: string
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[]
}

// A tiny sample so the quiz shell renders; real questions load server-side later.
export const mockQuestions: MockQuestion[] = [
  {
    id: 1,
    section: 'Technical Skills',
    text: 'A key client requests a major feature two weeks before delivery that was not in scope. What do you do?',
    options: [
      { key: 'A', text: 'Accept immediately to maintain the relationship.' },
      { key: 'B', text: 'Assess impact on scope, timeline, budget, and quality first.' },
      { key: 'C', text: 'Reject because scope is frozen.' },
      { key: 'D', text: 'Ask the team to implement it quietly.' },
    ],
  },
  {
    id: 2,
    section: 'Technical Skills',
    text: 'A strong team member repeatedly misses deadlines due to personal issues. You...',
    options: [
      { key: 'A', text: 'Reassign all critical work without discussion.' },
      { key: 'B', text: 'Meet privately and agree on a recovery plan.' },
      { key: 'C', text: 'Issue a formal warning immediately.' },
      { key: 'D', text: 'Ignore it given past performance.' },
    ],
  },
]

export const MOTIVATIONS = [
  'Great start — keep the momentum going! 🚀',
  "You're a third of the way there. Stay sharp! 💪",
  'Halfway done — you’re doing brilliantly! 🌟',
  'Two-thirds in. Keep it up! 🔥',
  'Almost there — finish strong! 🏁',
  'Last stretch — you’ve got this! 🎉',
]
