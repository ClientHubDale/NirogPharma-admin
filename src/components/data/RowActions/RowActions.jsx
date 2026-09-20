import { Fragment } from 'react'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * ⋯ menu at the end of a table row. Stops clicks from also opening the row.
 * actions: [{ label, icon, onSelect, destructive?, separatorBefore? }]
 */
export function RowActions({ label, actions }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={label}
          className="grid size-8 place-items-center rounded-md text-ink-muted outline-none hover:bg-mint-pale hover:text-black focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {actions.map(({ label: text, icon: Icon, onSelect, destructive, separatorBefore }) => (
            <Fragment key={text}>
              {separatorBefore && <DropdownMenuSeparator />}
              <DropdownMenuItem variant={destructive ? 'destructive' : 'default'} onSelect={onSelect} className="gap-2.5">
                {Icon && <Icon className="size-4" />} {text}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
