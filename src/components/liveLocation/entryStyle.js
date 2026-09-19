import { LogIn, LogOut, MapPin, MapPinPlus, PencilLine, ShoppingCart, Store, Wallet } from 'lucide-react'

/** Icon + colour per timeline entry type — shared by the timeline and the map markers. */
export const ENTRY_STYLE = {
  check_in: { icon: LogIn, tile: 'bg-green-deep text-white', label: 'Checked in' },
  check_out: { icon: LogOut, tile: 'bg-ink-muted text-white', label: 'Checked out' },
  live: { icon: MapPin, tile: 'bg-green-fresh text-white', label: 'Last location' },
  visit: { icon: Store, tile: 'bg-white text-forest', label: 'Visit' },
  order: { icon: ShoppingCart, tile: 'bg-black text-white', label: 'Order' },
  payment: { icon: Wallet, tile: 'bg-warning text-white', label: 'Payment' },
  party_added: { icon: MapPinPlus, tile: 'bg-mint text-forest', label: 'New party' },
  party_updated: { icon: PencilLine, tile: 'bg-white text-ink', label: 'Party updated' },
}
