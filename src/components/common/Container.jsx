import { cn } from '@/lib/utils'

/** Max-width page column with the standard side gutters. */
export function Container({ className, children, ...props }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6', className)} {...props}>
      {children}
    </div>
  )
}
