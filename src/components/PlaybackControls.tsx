import { useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onToggle: () => void
  onSeek: (time: number) => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onToggle,
  onSeek,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: PlaybackControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || duration <= 0) return
      const rect = track.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      onSeek(percent * duration)
    },
    [duration, onSeek],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      setDragging(true)
      seekFromEvent(e.clientX)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [seekFromEvent],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return
      seekFromEvent(e.clientX)
    },
    [dragging, seekFromEvent],
  )

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  return (
    <motion.div
      className="flex flex-col items-center gap-3 w-full max-w-xs"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Prev / Play-Pause / Next */}
      <div className="flex items-center gap-6">
        {/* Previous */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="cursor-pointer border-none bg-transparent p-2 transition-opacity duration-500"
          style={{ opacity: hasPrev ? 0.3 : 0.1 }}
          aria-label="Previous track"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2h2v12H3V2zm10 0L6 8l7 6V2z" />
          </svg>
        </button>

        {/* Play / Pause */}
        <button
          onClick={onToggle}
          className="group cursor-pointer border-none bg-transparent p-2 opacity-30 hover:opacity-100 transition-opacity duration-500"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
          }}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="0.5" />
              <rect x="9" y="2" width="4" height="12" rx="0.5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2L14 8L4 14V2Z" />
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="cursor-pointer border-none bg-transparent p-2 transition-opacity duration-500"
          style={{ opacity: hasNext ? 0.3 : 0.1 }}
          aria-label="Next track"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 2h2v12h-2V2zM3 2l7 6-7 6V2z" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full flex items-center gap-2">
        <span
          className="opacity-30 w-8 text-right"
          style={{ fontSize: '8px', letterSpacing: '0.1em' }}
        >
          {formatTime(currentTime)}
        </span>

        <div
          ref={trackRef}
          className="flex-1 relative h-4 flex items-center cursor-pointer group"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          style={{ touchAction: 'none' }}
        >
          {/* Track */}
          <div
            className="w-full transition-opacity duration-300"
            style={{
              height: '1px',
              background: dragging
                ? 'var(--color-text-muted)'
                : 'rgba(74,74,74,0.25)',
            }}
          />
          {/* Progress */}
          <div
            className="absolute left-0 transition-opacity duration-300"
            style={{
              height: '1px',
              width: `${progress}%`,
              background: 'var(--color-text)',
            }}
          />
          {/* Dot — visible while dragging or hovering */}
          <div
            className="absolute transition-opacity duration-300"
            style={{
              left: `${progress}%`,
              transform: 'translateX(-50%)',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--color-text)',
              opacity: dragging ? 1 : undefined,
            }}
          />
        </div>

        <span
          className="opacity-30 w-8"
          style={{ fontSize: '8px', letterSpacing: '0.1em' }}
        >
          {formatTime(duration)}
        </span>
      </div>
    </motion.div>
  )
}
