import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/Logo'

/** Placeholder — the real login screen is the next step. */
export default function Login() {
  return (
    <div className="bg-hero flex min-h-full flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="text-4xl font-extrabold sm:text-5xl">Login is coming next</h1>
      <p className="max-w-md text-ink-muted">
        Admins and distributors will sign in here with their mobile number and password.
      </p>
      <Button asChild variant="outline" size="lg">
        <Link to="/">
          <ArrowLeft data-icon="inline-start" /> Back to home
        </Link>
      </Button>
    </div>
  )
}
