import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { IconTile } from '@/components/common/IconTile'
import { TextField } from '@/components/form/TextField'
import { Logo } from '@/components/common/Logo'
import { downloadHref, site } from '@/constants/site'
import { homePathForRole } from '@/constants/roles'
import { AUTH_ERRORS, DEMO_ACCOUNTS } from '@/services/authService'
import { clearAuthError, loginUser, selectAuthError, selectAuthStatus } from '@/store/authSlice'

const MOBILE_PATTERN = /^[6-9]\d{9}$/

const webRoles = [
  {
    icon: ShieldCheck,
    title: 'Admin',
    text: 'Users, items, stock, bills, payment confirmation and every report.',
  },
  {
    icon: Truck,
    title: 'Distributor',
    text: 'Your orders, stock, bills, ledger and outstanding — only your own data.',
  },
]

function validate({ mobile, password }) {
  const errors = {}
  if (!mobile) errors.mobile = 'Enter your mobile number.'
  else if (!MOBILE_PATTERN.test(mobile)) errors.mobile = 'Enter a valid 10-digit mobile number.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}

/** Left panel on desktop: brand, who signs in here, and the app-only note. */
function BrandPanel() {
  return (
    <aside className="bg-hero relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
      <Logo />
      <div className="relative">
        <h2 className="max-w-md text-5xl leading-[1.05] font-extrabold">Welcome back to {site.name}</h2>
        <p className="mt-4 max-w-md text-lg text-forest">
          Sign in with the mobile number and password issued by the office. You will see only what your role
          needs.
        </p>
        <div className="mt-10 grid max-w-md gap-4">
          {webRoles.map((role) => (
            <div key={role.title} className="flex gap-4 rounded-2xl bg-white/80 p-5 shadow-glow backdrop-blur-sm">
              <IconTile icon={role.icon} className="shrink-0" />
              <div>
                <p className="font-bold text-black">{role.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{role.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="relative flex items-center gap-2 text-sm text-forest">
        <Smartphone className="size-4" />
        Managers and executives use the mobile app.
      </p>
    </aside>
  )
}

/** Error / notice box above the form. App-only roles get a friendlier, actionable message. */
function AuthNotice({ error }) {
  if (!error) return null

  if (error.code === AUTH_ERRORS.APP_ONLY_ROLE) {
    return (
      <div role="alert" className="flex gap-3 rounded-lg border border-mint bg-mint-pale p-4 text-sm text-forest">
        <Smartphone className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">Please use the mobile app</p>
          <p className="mt-1">{error.message}</p>
          <a href={downloadHref} className="mt-2 inline-block font-semibold text-green-deep underline underline-offset-4">
            Get the app
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="flex gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{error.message}</p>
    </div>
  )
}

/** Dev-only helper: click an account to fill the form. Never shown in production builds. */
function DemoAccounts({ onPick }) {
  if (!import.meta.env.DEV) return null
  return (
    <div className="mt-8 rounded-xl border border-dashed border-green-soft bg-white/60 p-4">
      <p className="text-xs font-semibold tracking-wide text-green-deep uppercase">Demo accounts · dev only</p>
      <div className="mt-3 grid gap-1.5">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.mobile}
            type="button"
            onClick={() => onPick(account)}
            className="flex items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-mint-pale"
          >
            <span className="font-semibold text-ink">
              {account.name}
              <span className="ml-1.5 font-normal text-ink-muted">
                · {account.role.toLowerCase()}
                {!account.isActive && ' · disabled'}
              </span>
            </span>
            <span className="font-mono text-ink-muted">{account.mobile}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useSelector(selectAuthStatus)
  const authError = useSelector(selectAuthError)

  const [form, setForm] = useState({ mobile: '', password: '', remember: true })
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const loading = status === 'loading'

  // Clear a stale error when the page is left and revisited.
  useEffect(() => () => dispatch(clearAuthError()), [dispatch])

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }))
    if (authError) dispatch(clearAuthError())
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return

    const result = await dispatch(loginUser(form))
    if (loginUser.fulfilled.match(result)) {
      const from = location.state?.from?.pathname
      navigate(from ?? homePathForRole(result.payload.user.role), { replace: true })
    }
  }

  const pickDemo = (account) => {
    setForm((current) => ({ ...current, mobile: account.mobile, password: account.password }))
    setFieldErrors({})
    dispatch(clearAuthError())
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="flex flex-col bg-bg px-4 py-6 sm:px-10 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:hidden" />
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-black"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-4xl leading-[1.05] font-extrabold sm:text-5xl">Sign in</h1>
          <p className="mt-3 text-ink-muted">For admins and distributors of {site.name}.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <AuthNotice error={authError} />

            <TextField
              id="mobile"
              label="Mobile number"
              prefix="+91"
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              placeholder="98765 43210"
              maxLength={10}
              value={form.mobile}
              onChange={(e) => update('mobile', e.target.value.replace(/\D/g, ''))}
              error={fieldErrors.mobile}
            />

            <div className="space-y-2">
              <TextField
                id="password"
                label="Password"
                labelAction={
                  <button
                    type="button"
                    onClick={() => setShowForgot((open) => !open)}
                    className="text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
                    aria-expanded={showForgot}
                  >
                    Forgot password?
                  </button>
                }
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                error={fieldErrors.password}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="grid h-full w-12 shrink-0 place-items-center text-ink-muted hover:text-black"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
              {showForgot && (
                <div className="flex gap-2.5 rounded-lg bg-mint-pale p-3.5 text-sm text-forest">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Passwords are issued by the office. Contact the {site.name} office at {site.contact.phone} to
                    reset yours.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember"
                checked={form.remember}
                onCheckedChange={(checked) => update('remember', checked === true)}
              />
              <Label htmlFor="remember" className="font-normal text-ink">
                Keep me signed in on this device
              </Label>
            </div>

            <Button type="submit" size="xl" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-muted lg:hidden">
            <Smartphone className="size-4" />
            Managers and executives use the mobile app.
          </p>

          <DemoAccounts onPick={pickDemo} />
        </div>
      </main>
    </div>
  )
}
