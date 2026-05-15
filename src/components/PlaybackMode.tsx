import { motion } from 'framer-motion'

export type PlayMode = 'sequential' | 'shuffle' | 'loop'

interface PlaybackModeProps {
  mode: PlayMode
  onCycle: () => void
}

/** Icons for each mode */
const icons: Record<PlayMode, JSX.Element> = {
  sequential: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      {/* Two arrows pointing right */}
      <path d="M2 4h8l-3-3" />
      <path d="M2 12h8l-3 3" />
    </svg>
  ),
  shuffle: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      {/* Crossed arrows */}
      <path d="M2 12l4-4-4-4" />
      <path d="M10 4l4 4-4 4" />
      <path d="M14 4H8.5C7.1 4 6 5.1 6 6.5V8" />
      <path d="M2 8h5.5C8.9 8 10 9.1 10 10.5V12" />
    </svg>
  ),
  loop: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      {/* Circular arrow with 1 inside */}
      <path d="M10 2l2 2-2 2" />
      <path d="M2 8V6a2 2 0 012-2h8" />
      <path d="M6 14l-2-2 2-2" />
      <path d="M14 8v2a2 2 0 01-2 2H4" />
      <text x="7" y="9.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="5" fontWeight="600">1</text>
    </svg>
  ),
}

const labels: Record<PlayMode, string> = {
  sequential: 'Sequential',
  shuffle: 'Shuffle',
  loop: 'Loop',
}

export default function PlaybackMode({ mode, onCycle }: PlaybackModeProps) {
  return (
    <motion.button
      onClick={onCycle}
      className="fixed bottom-4 right-4 z-50 cursor-pointer bg-transparent p-3"
      style={{
        borderRadius: '4px',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}
      whileHover={{ borderColor: 'var(--color-text-muted)' }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Playback mode: ${labels[mode]}. Click to switch.`}
      title={labels[mode]}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        key={mode}
        initial={{ opacity: 0, rotate: -20 }}
        animate={{ opacity: 1, rotate: 0 }}
        exit={{ opacity: 0, rotate: 20 }}
        transition={{ duration: 0.2 }}
      >
        {icons[mode]}
      </motion.div>
    </motion.button>
  )
}
