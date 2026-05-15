import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { searchTracks, getCoverUrl, getSongStreamUrl } from '../api/musicApi'
import type { TrackResult } from '../api/musicApi'
import type { Album } from '../data/albums'

interface SearchBarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddAlbum: (album: Album) => void
}

function hashGradient(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  const hue = Math.abs(h % 360)
  return `linear-gradient(135deg, hsl(${hue}, 30%, 20%), hsl(${(hue + 40) % 360}, 40%, 35%))`
}

function trackToAlbum(t: TrackResult): Album {
  return {
    id: t.id,
    title: t.title || 'Unknown',
    artist: t.artist || 'Unknown',
    cover: t.cover_url ? getCoverUrl(t.cover_url) : '',
    audio: t.song_id ? getSongStreamUrl(t.song_id) : '',
    gradient: hashGradient(t.id),
  }
}

export default function SearchBar({ open, onOpenChange, onAddAlbum }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TrackResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setError('')
    }
  }, [open])

  const doSearch = useCallback((q: string) => {
    clearTimeout(timerRef.current)
    abortRef.current?.abort()
    if (!q.trim()) {
      setResults([])
      setError('')
      return
    }
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError('')
      try {
        const data = await searchTracks(q.trim(), 8, controller.signal)
        setResults(data)
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setError('Search timed out. Try again.')
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 600)
  }, [])

  const handleSelect = (track: TrackResult) => {
    onAddAlbum(trackToAlbum(track))
    onOpenChange(false)
  }

  // Keyboard: Escape closes
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  const close = () => onOpenChange(false)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col items-center justify-start pt-32"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop — clickable to close, keyboard-accessible */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(245,245,245,0.95)', backdropFilter: 'blur(20px)' }}
            role="button"
            tabIndex={-1}
            aria-label="Close search"
            onClick={close}
            onKeyDown={(e) => { if (e.key === 'Escape') close() }}
          />

          <motion.div
            className="relative z-10 w-full max-w-md mx-auto px-8 md:px-12"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            exit={{ y: -20 }}
          >
            {/* Search input row with close button */}
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  doSearch(e.target.value)
                }}
                placeholder="SEARCH…"
                aria-label="Search music"
                className="flex-1 bg-transparent outline-none
                  focus-visible:border-b-2 focus-visible:border-b-[var(--color-accent)]
                  transition-[border-color] duration-200"
                style={{
                  fontSize: '14px',
                  letterSpacing: '0.15em',
                  color: 'var(--color-text)',
                  borderBottom: '1px solid rgba(74,74,74,0.3)',
                  padding: '10px 4px',
                  minHeight: '44px',
                }}
              />

              {/* Close (X) button — 44×44 touch target */}
              <button
                onClick={close}
                className="flex-shrink-0 cursor-pointer bg-transparent flex items-center justify-center
                  transition-opacity duration-200 hover:opacity-60
                  focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  touchAction: 'manipulation',
                }}
                aria-label="Close search"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>

            {loading && (
              <p className="mt-3" style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--color-text-muted)' }}>
                SEARCHING…
              </p>
            )}

            {error && !loading && (
              <div className="mt-3 flex items-center gap-2">
                <p style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'var(--color-text-muted)', margin: 0 }}>
                  {error}
                </p>
                <button
                  onClick={() => doSearch(query)}
                  className="cursor-pointer bg-transparent underline
                    focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    color: 'var(--color-text)',
                    padding: '4px 8px',
                    minHeight: '28px',
                    border: 'none',
                    touchAction: 'manipulation',
                  }}
                >
                  RETRY
                </button>
              </div>
            )}

            {/* Results list — overscroll contained */}
            <div
              className="mt-4 max-h-96 overflow-y-auto"
              style={{ overscrollBehavior: 'contain' }}
            >
              {results.map((track) => (
                <motion.button
                  key={track.id}
                  onClick={() => handleSelect(track)}
                  className="w-full text-left cursor-pointer bg-transparent p-3 flex items-center gap-3
                    transition-opacity duration-200
                    hover:opacity-100 focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2
                    min-h-[48px]"
                  style={{
                    borderBottom: '1px solid rgba(74,74,74,0.12)',
                    opacity: 0.85,
                    touchAction: 'manipulation',
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 0.85, y: 0 }}
                >
                  {track.cover_url ? (
                    <img
                      src={getCoverUrl(track.cover_url)}
                      alt={`${track.title} cover`}
                      width={44}
                      height={44}
                      className="flex-shrink-0 object-cover"
                      style={{ borderRadius: 0, width: 44, height: 44 }}
                    />
                  ) : (
                    <div
                      className="flex-shrink-0"
                      style={{ width: 44, height: 44, background: hashGradient(track.id) }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate" style={{ fontSize: '11px', letterSpacing: '0.1em', margin: 0, color: 'var(--color-text)' }}>
                      {track.title || 'Unknown'}
                    </p>
                    <p className="truncate" style={{ fontSize: '9px', letterSpacing: '0.1em', margin: '2px 0 0', color: 'var(--color-text-muted)' }}>
                      {track.artist}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
