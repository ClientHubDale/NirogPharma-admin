import { ChevronDown, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** "Export As ▾" — options: [{ label, hint?, icon?, onSelect }] */
export function ExportMenu({ options, disabled }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="outline" size="lg" className="h-11">
          <FileDown data-icon="inline-start" /> Export As <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export the filtered list</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(({ label, hint, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={label} onSelect={onSelect} className="items-start gap-2.5 py-2">
            {Icon && <Icon className="mt-0.5 size-4 text-green-deep" />}
            <span>
              <span className="block font-semibold">{label}</span>
              {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
