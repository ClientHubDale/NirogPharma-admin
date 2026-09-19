import { ClipboardList, FilePlus2, PackagePlus, Plus, UserPlus, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const actions = [
  { label: 'Add party', icon: UserPlus, path: '/admin/parties/customers' },
  { label: 'Add item', icon: PackagePlus, path: '/admin/inventory/items' },
  { label: 'New sales order', icon: ClipboardList, path: '/admin/sales/orders' },
  { label: 'New invoice', icon: FilePlus2, path: '/admin/sales/invoices' },
  { label: 'Record payment', icon: Wallet, path: '/admin/finance/payments' },
  { label: 'Add user', icon: UserPlus, path: '/admin/users/employees' },
]

/** The black "+" button: shortcuts to create the most common records. */
export function QuickCreateMenu() {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-lg" className="size-10" aria-label="Quick create">
          <Plus className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Create new</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map(({ label, icon: Icon, path }) => (
          <DropdownMenuItem key={label} onSelect={() => navigate(path)} className="gap-2.5 py-2">
            <Icon className="size-4 text-green-deep" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
