import { CircleCheck, CircleDashed, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** ⋯ menu at the end of an item row. Stops clicks from also opening the row. */
export function ItemRowActions({ item, onEdit, onToggleStatus, onDelete }) {
  const active = item.status === 'ACTIVE'
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${item.name}`}
          className="grid size-8 place-items-center rounded-md text-ink-muted outline-none hover:bg-mint-pale hover:text-black focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => onEdit(item)} className="gap-2.5">
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onToggleStatus(item)} className="gap-2.5">
            {active ? <CircleDashed className="size-4" /> : <CircleCheck className="size-4" />}
            {active ? 'Move to draft' : 'Mark as active'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item)} className="gap-2.5">
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
