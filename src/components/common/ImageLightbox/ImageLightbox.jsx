import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { cn } from '@/lib/utils'

const toolBtn = 'grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30'

/**
 * Full-screen photo viewer: zoom, rotate, previous/next (← → keys), Esc to close.
 * images: [{ id, url, caption? }]
 */
export function ImageLightbox({ images, startIndex = 0, open, onOpenChange, title }) {
  const [index, setIndex] = useState(startIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const image = images[index]

  const go = (next) => {
    setIndex((next + images.length) % images.length)
    setZoom(1)
    setRotation(0)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (images.length > 1 && e.key === 'ArrowRight') go(index + 1)
            if (images.length > 1 && e.key === 'ArrowLeft') go(index - 1)
          }}
          className="fixed inset-0 z-50 flex flex-col outline-none"
        >
          <header className="relative z-10 flex items-center justify-between gap-3 bg-black/70 px-4 py-3 text-white">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-sm font-semibold">{title}</Dialog.Title>
              <p className="text-xs text-white/60">
                {images.length > 1 ? `${index + 1} of ${images.length}` : ''}
                {image?.caption ? `${images.length > 1 ? ' · ' : ''}${image.caption}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className={toolBtn} aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
                <ZoomOut className="size-5" />
              </button>
              <button type="button" className={toolBtn} aria-label="Zoom in" disabled={zoom >= 4} onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>
                <ZoomIn className="size-5" />
              </button>
              <button type="button" className={toolBtn} aria-label="Rotate" onClick={() => setRotation((r) => r + 90)}>
                <RotateCw className="size-5" />
              </button>
              <Dialog.Close className={toolBtn} aria-label="Close">
                <X className="size-5" />
              </Dialog.Close>
            </div>
          </header>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4" onClick={() => onOpenChange(false)}>
            {image && (
              <img
                src={image.url}
                alt={image.caption ?? title}
                onClick={(e) => e.stopPropagation()}
                className={cn('max-h-full max-w-full rounded-lg object-contain shadow-lift transition-transform duration-200', zoom > 1 && 'cursor-zoom-out')}
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
              />
            )}
            {images.length > 1 && (
              <>
                <button type="button" className={cn(toolBtn, 'absolute top-1/2 left-4 -translate-y-1/2')} aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); go(index - 1) }}>
                  <ChevronLeft className="size-5" />
                </button>
                <button type="button" className={cn(toolBtn, 'absolute top-1/2 right-4 -translate-y-1/2')} aria-label="Next photo" onClick={(e) => { e.stopPropagation(); go(index + 1) }}>
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
