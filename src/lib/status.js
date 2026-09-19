/**
 * Status tones → Tailwind classes. Status colours mean state (on track,
 * needs attention, overdue) and are always shown with a label, never alone.
 */
export const TONE_CLASSES = {
  success: { bar: 'bg-success', soft: 'bg-success-soft', ink: 'text-forest', text: 'text-success' },
  warning: { bar: 'bg-warning', soft: 'bg-warning-soft', ink: 'text-warning-ink', text: 'text-warning' },
  danger: { bar: 'bg-danger', soft: 'bg-danger-soft', ink: 'text-danger-ink', text: 'text-danger' },
  neutral: { bar: 'bg-ink-muted/40', soft: 'bg-bg', ink: 'text-ink-muted', text: 'text-ink-muted' },
}

/** Bills: overdue past 45 days is critical, past 30 needs attention (SOW: 30-day reminder). */
export const toneForOverdueDays = (days) => (days > 45 ? 'danger' : days > 30 ? 'warning' : 'success')

/** Visits against the monthly target. */
export function toneForVisits(visits, target) {
  const ratio = visits / target
  return ratio >= 0.66 ? 'success' : ratio >= 0.4 ? 'warning' : 'danger'
}
