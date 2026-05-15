import { useEffect, useCallback, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import type { Album } from '../data/albums'
import VinylDisc from './VinylDisc'
import SoundRipples from './SoundRipples'
import PlaybackControls from './PlaybackControls'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

interface PlayerViewProps {
  album: Album
  onBack: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

export default function PlayerView({ album, onBack, onPrev, onNext, hasPrev, hasNext }: PlayerViewProps) {
  const {
    play,
    toggle,
    stop,
    seek,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    analyser,
  } = useAudioPlayer()

  const [vinylSize, setVinylSize] = useState(320)
  const [hasAttemptedAutoplay, setHasAttemptedAutoplay] = useState(false)
  const [detectedBpm, setDetectedBpm] = useState(album.bpm ?? 100)
  const vinylElRef = useRef<HTMLDivElement>(null)

  // Update BPM when album changes
  useEffect(() => {
    setDetectedBpm(album.bpm ?? 100)
  }, [album.bpm])

  // BPM → spin duration: scale from ~8s (60 BPM) to ~1.8s (160 BPM)
  const spinDuration = Math.max(1.8, Math.min(8, 960 / detectedBpm))

  // Auto-play on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      play(album.audio)
      setHasAttemptedAutoplay(true)
    }, 600) // Wait for entrance animation
    return () => clearTimeout(timer)
  }, [album.audio, play])

  // Responsive vinyl size
  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth
      if (w < 640) setVinylSize(280)
      else if (w < 1024) setVinylSize(380)
      else setVinylSize(440)
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      } else if (e.code === 'Escape') {
        stop()
        onBack()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        onNext()
      }
    },
    [toggle, stop, onBack, onPrev, onNext],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleBack = () => {
    stop()
    onBack()
  }

  // Click on vinyl area to toggle play
  const handleVinylClick = () => {
    toggle()
  }

  // Show "tap to play" hint when autoplay was blocked
  const showPlayHint = hasAttemptedAutoplay && !isPlaying && !isLoading

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 20, background: 'var(--color-bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Vinyl + ripples container */}
      <div
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          width: vinylSize * 2,
          height: vinylSize * 2,
        }}
        onClick={handleVinylClick}
      >
        <SoundRipples
          analyser={analyser}
          isPlaying={isPlaying}
          vinylSize={vinylSize}
          bpm={detectedBpm}
          vinylElRef={vinylElRef}
        />
        <motion.div
          ref={vinylElRef}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <VinylDisc
            cover={album.cover}
            gradient={album.gradient}
            isPlaying={isPlaying}
            size={vinylSize}
            alt={album.title}
            spinDuration={spinDuration}
          />

          {/* Play button overlay when not playing */}
          {showPlayHint && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: vinylSize * 0.4,
                  height: vinylSize * 0.4,
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <svg
                  width={vinylSize * 0.15}
                  height={vinylSize * 0.15}
                  viewBox="0 0 24 24"
                  fill="white"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <motion.p
          className="mt-4 opacity-30"
          style={{ fontSize: '9px', letterSpacing: '0.2em' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
        >
          Loading…
        </motion.p>
      )}

      {/* Tap to play hint */}
      {showPlayHint && (
        <motion.p
          className="mt-2"
          style={{ fontSize: '8px', letterSpacing: '0.15em', opacity: 0.4 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.8 }}
        >
          TAP TO PLAY
        </motion.p>
      )}

      {/* Album info */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.3, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <p style={{ fontSize: '10.5px', letterSpacing: '0.2em', margin: 0 }}>
          {album.title}
        </p>
        <p
          style={{
            fontSize: '8px',
            letterSpacing: '0.15em',
            margin: '4px 0 0',
            opacity: 0.7,
          }}
        >
          {album.artist}
        </p>
      </motion.div>

      {/* Playback controls */}
      <div className="mt-6">
        <PlaybackControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onToggle={toggle}
          onSeek={seek}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      </div>

      {/* Back button - bottom left */}
      <motion.button
        onClick={handleBack}
        className="fixed bottom-6 left-6 cursor-pointer border-none bg-transparent p-2 opacity-30 hover:opacity-100 transition-opacity duration-500"
        style={{ fontSize: '8px', letterSpacing: '0.15em' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.5 }}
        whileHover={{ opacity: 1 }}
      >
        ESC
      </motion.button>
    </motion.div>
  )
}
