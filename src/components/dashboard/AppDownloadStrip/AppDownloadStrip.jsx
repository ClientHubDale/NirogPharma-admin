import { PlayStoreBadge } from '@/components/common/PlayStoreBadge'

/** Play Store badge + one line on how the field app feeds the dashboard. */
export function AppDownloadStrip({ text }) {
  return (
    <div className="flex flex-col items-start gap-5 rounded-2xl border border-mint-pale bg-white p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-7">
      <PlayStoreBadge className="shrink-0" />
      <p className="text-[0.95rem] leading-relaxed text-ink">{text}</p>
    </div>
  )
}
