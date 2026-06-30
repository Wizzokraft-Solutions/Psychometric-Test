import { Link } from 'react-router-dom'
import logo from '@/assets/Logo.png'

export default function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Wizzokraft logo" className="h-10 w-auto" />
          <span className="text-lg font-semibold tracking-tight">
            Wizzokraft Psychometric Test
          </span>
        </Link>
      </div>
    </header>
  )
}
