import { Routes, Route } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import QuizPage from '@/pages/QuizPage'
import AdminPage from '@/pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}

export default App
