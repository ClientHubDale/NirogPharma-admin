import { LogOut, UserRound } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS } from '@/constants/roles'
import { initialsOf } from '@/lib/format'
import { logoutUser, selectUser } from '@/store/authSlice'

/** Avatar with the signed-in user's initials; opens name, role and sign-out. */
export function UserMenu() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-10 place-items-center rounded-full bg-black text-sm font-bold text-white ring-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Account menu"
      >
        {initialsOf(user?.name) || <UserRound className="size-5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="font-semibold text-black">{user?.name}</p>
          <p className="text-xs text-ink-muted">
            {ROLE_LABELS[user?.role]} · +91 {user?.mobile}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="gap-2.5 py-2">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
