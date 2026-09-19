import { WhatsAppIcon } from '@/components/common/WhatsAppIcon'
import { whatsappHref } from '@/constants/site'

/** Floating WhatsApp button, bottom-right on every dashboard page. */
export function WhatsAppFab() {
  return (
    <a
      href={whatsappHref ?? '#'}
      target={whatsappHref ? '_blank' : undefined}
      rel={whatsappHref ? 'noreferrer' : undefined}
      aria-label="Chat with the office on WhatsApp"
      className="fixed right-5 bottom-5 z-30 grid size-14 place-items-center rounded-full bg-green-fresh text-white shadow-glow transition-transform hover:scale-105 sm:right-8 sm:bottom-8 sm:size-16"
    >
      <WhatsAppIcon className="size-7 sm:size-8" />
    </a>
  )
}
