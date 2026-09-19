import { Search } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import { lastSeenClock, LIVE_STATUS_STYLE, liveStatusOf } from '@/lib/liveStatus'

/** Right-hand "Users" panel: search, then everyone in the current filter. Click to focus on the map. */
export function UserListPanel({ users, query, onQueryChange, selectedId, onSelect, className }) {
  return (
    <aside className={cn('flex min-h-0 flex-col rounded-2xl border border-mint-pale bg-white', className)}>
      <div className="border-b border-mint-pale p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Users</h2>
          <span className="text-sm text-ink-muted">{users.length} shown</span>
        </div>
        <label className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-mint px-3 focus-within:border-green-fresh focus-within:ring-3 focus-within:ring-ring/25">
          <Search className="size-4 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search user or area"
            aria-label="Search user or area"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-ink-muted/70"
          />
        </label>
      </div>

      {users.length === 0 ? (
        <p className="p-6 text-center text-sm text-ink-muted">No users match this filter.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-mint-pale overflow-y-auto">
          {users.map((user) => {
            const status = liveStatusOf(user)
            const style = LIVE_STATUS_STYLE[status]
            const selected = user.id === selectedId
            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => onSelect(user.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    selected ? 'bg-mint-pale' : 'hover:bg-bg',
                  )}
                >
                  <span className="relative">
                    <UserAvatar name={user.name} className={style.avatar} />
                    <span className={cn('absolute right-0 bottom-0 size-3 rounded-full ring-2 ring-white', style.dot)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-black uppercase">{user.name}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {style.label}
                      {user.area ? ` · ${user.area}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-muted">{lastSeenClock(user) ?? '—'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
