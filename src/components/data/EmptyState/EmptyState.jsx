import { FileSearch } from 'lucide-react'

/** Illustration + message for empty lists (template style, no image files). */
export function EmptyState({ title, description, icon: Icon = FileSearch, children }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center sm:py-24">
      <div className="relative" aria-hidden>
        <div className="absolute inset-0 -m-8 rounded-full bg-green-fresh/15 blur-2xl" />
        <div className="relative grid size-28 place-items-center rounded-full bg-gradient-to-br from-mint-pale to-mint">
          <div className="grid size-16 place-items-center rounded-2xl bg-white shadow-glow">
            <Icon className="size-8 text-green-deep" strokeWidth={1.75} />
          </div>
        </div>
      </div>
      <h2 className="mt-6 text-xl font-bold">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2.5">{children}</div>}
    </div>
  )
}
