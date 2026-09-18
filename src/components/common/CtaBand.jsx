import { Container } from './Container'

/** Large centred closing headline + one action, on a soft mint fade. */
export function CtaBand({ title, subtitle, children }) {
  return (
    <section className="bg-fade-up py-20 sm:py-28">
      <Container className="text-center">
        <h2 className="mx-auto max-w-3xl text-4xl leading-[1.05] font-extrabold sm:text-5xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">{subtitle}</p>}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">{children}</div>
      </Container>
    </section>
  )
}
