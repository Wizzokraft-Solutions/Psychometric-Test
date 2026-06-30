import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import logo from '@/assets/Logo.png'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* brand gradient accent strip */}
      <div className="brand-gradient h-1 w-full" />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="group flex items-center gap-3">
          <motion.img
            src={logo}
            alt="Wizzokraft logo"
            className="h-9 w-auto"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          />
          <span className="hidden text-base font-semibold tracking-tight sm:inline">
            <span className="brand-text-gradient">Wizzokraft</span>{' '}
            <span className="text-muted-foreground">Psychometric Test</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
