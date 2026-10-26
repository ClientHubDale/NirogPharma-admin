import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MIN = 1
const MAX = 6
const STEP = 0.25

const clamp = (value) => Math.min(MAX, Math.max(MIN, Math.round(value * 100) / 100))

/**
 * A photo on the whole screen, with zoom — "बड़े स्केल में दिखेगा".
 *
 * The wheel zooms, dragging moves the picture once it is bigger than the
 * screen, and double-clicking jumps between fit and close-up. Everything is
 * also on the keyboard: + and − zoom, 0 fits, Escape closes.
 */
export function PhotoViewer({ open, src, title, subtitle, onClose }) {
  const [zoom, setZoom] = useState(MIN)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef(null)

  const fit = useCallback(() => {
    setZoom(MIN)
    setPan({ x: 0, y: 0 })
  }, [])

  // Each photo opens fitted, never at the last one's zoom — adjusted during
  // the render that notices the change rather than in an effect afterwards.
  const [shown, setShown] = useState(null)
  if (open && shown !== src) {
    setShown(src)
    setZoom(MIN)
    setPan({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom((z) => clamp(z + STEP))
      if (e.key === '-' || e.key === '_') setZoom((z) => clamp(z - STEP))
      if (e.key === '0') fit()
    }
    window.addEventListener('keydown', onKey)
    // The page behind must not scroll while the photo is up.
    const had = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = had
    }
  }, [open, onClose, fit])

  if (!open) return null

  const zoomBy = (delta) =>
    setZoom((z) => {
      const next = clamp(z + delta)
      if (next === MIN) setPan({ x: 0, y: 0 })
      return next
    })

  const startDrag = (e) => {
    if (zoom === MIN) return
    dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onDrag = (e) => {
    if (!dragging.current) return
    setPan({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y })
  }
  const endDrag = () => {
    dragging.current = null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
      onClick={onClose}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 text-white sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{title}</p>
          {subtitle && <p className="truncate font-mono text-xs text-white/60">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => zoomBy(-STEP)}
            disabled={zoom <= MIN}
            aria-label="Zoom out"
            className="grid size-9 place-items-center rounded-lg text-white/80 hover:bg-white/15 disabled:opacity-30"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={fit}
            aria-label="Fit to screen"
            title="Fit to screen"
            className="min-w-14 rounded-lg px-2 py-1.5 font-mono text-sm text-white/80 tabular-nums hover:bg-white/15"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => zoomBy(STEP)}
            disabled={zoom >= MAX}
            aria-label="Zoom in"
            className="grid size-9 place-items-center rounded-lg text-white/80 hover:bg-white/15 disabled:opacity-30"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={fit}
            aria-label="Reset"
            className="ml-1 grid size-9 place-items-center rounded-lg text-white/80 hover:bg-white/15"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="ml-1 grid size-9 place-items-center rounded-lg text-white hover:bg-white/15"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      <div
        className={cn('flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-8', zoom > MIN && 'cursor-grab active:cursor-grabbing')}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? STEP : -STEP)}
        onDoubleClick={() => (zoom > MIN ? fit() : setZoom(2))}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={src}
          alt={title}
          draggable={false}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          className="max-h-full max-w-full origin-center object-contain select-none"
        />
      </div>

      <p className="shrink-0 pb-4 text-center text-xs text-white/50" onClick={(e) => e.stopPropagation()}>
        Scroll to zoom · double-click to zoom in · drag to move · Esc to close
      </p>
    </div>
  )
}
