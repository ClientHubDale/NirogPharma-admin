import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Label } from '@/components/ui/label'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Fixed number of image slots with previews. Holds { id, url, name, file? } —
 * `file` is what the backend upload (Cloudinary) will send later.
 */
export function ImageUploader({ label = 'Upload images', images, onChange, max = 5, onError }) {
  const inputRef = useRef(null)

  const addFiles = (fileList) => {
    const room = max - images.length
    const accepted = []
    for (const file of Array.from(fileList).slice(0, room)) {
      if (!ACCEPT.includes(file.type)) {
        onError?.(`${file.name}: only JPG, PNG or WEBP images are allowed.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        onError?.(`${file.name}: images must be under 5 MB.`)
        continue
      }
      accepted.push({ id: `${Date.now()}-${file.name}`, url: URL.createObjectURL(file), name: file.name, file })
    }
    if (accepted.length) onChange([...images, ...accepted])
  }

  const remove = (id) => {
    const target = images.find((img) => img.id === id)
    if (target?.file) URL.revokeObjectURL(target.url)
    onChange(images.filter((img) => img.id !== id))
  }

  return (
    <div className="sm:col-span-2">
      <Label className="mb-2 font-semibold text-ink">
        {label} <span className="font-normal text-ink-muted">({images.length}/{max})</span>
      </Label>
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.id} className="group relative size-20 overflow-hidden rounded-xl border border-mint bg-bg">
            <img src={img.url} alt={img.name} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => remove(img.id)}
              aria-label={`Remove ${img.name}`}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/75 text-white hover:bg-black"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid size-20 place-items-center rounded-xl border-2 border-dashed border-mint bg-white text-ink-muted transition-colors hover:border-green-fresh hover:text-green-deep"
            aria-label="Add image"
          >
            <ImagePlus className="size-6" />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-muted">JPG, PNG or WEBP, up to 5 MB each.</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
