/**
 * Titled block inside a form ("General Details", "Price Details"…).
 * `grid-cols-1` matters: an implicit grid column grows to its widest child
 * (e.g. two date inputs) and pushes the page wider than a phone screen.
 */
export function FormSection({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-mint-pale bg-white">
      <header className="rounded-t-2xl border-b border-mint-pale bg-bg px-5 py-3.5">
        <h3 className="text-base font-bold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </header>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}
