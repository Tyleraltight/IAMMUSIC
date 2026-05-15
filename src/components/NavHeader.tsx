import { motion } from 'framer-motion'

interface NavHeaderProps {
  showBack: boolean
  onBack: () => void
  onSearch?: () => void
  onStudio?: () => void
}

export default function NavHeader({ showBack, onBack, onSearch, onStudio }: NavHeaderProps) {
  return (
    <motion.header
      className="fixed top-0 left-0 z-50 flex items-start p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      {showBack ? (
        <motion.button
          onClick={onBack}
          className="flex items-center gap-2 cursor-pointer bg-transparent p-0 border-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ opacity: 0.6 }}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: 'var(--color-text)',
            padding: '8px 14px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            minHeight: '44px',
            touchAction: 'manipulation',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M8 1L3 6L8 11" stroke="currentColor" strokeWidth="1" />
          </svg>
          BACK
        </motion.button>
      ) : (
        <nav className="flex gap-2" aria-label="Main navigation">
          {/* Non-interactive brand labels */}
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="px-3 py-2.5 md:px-5 md:pt-10 md:pb-[7px] inline-block"
            style={{
              fontSize: '10px',
              letterSpacing: '0.15em',
              color: 'var(--color-text)',
              borderRadius: '4px',
              border: '1px solid rgba(74,74,74,0.15)',
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            VINYL PLAYER ®
          </motion.span>

          {/* SEARCH — interactive button */}
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onClick={onSearch}
            className="px-3 py-2.5 md:px-5 md:pt-10 md:pb-[7px] cursor-pointer bg-transparent inline-flex items-center
              transition-opacity duration-200
              hover:opacity-60 focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2"
            style={{
              fontSize: '10px',
              letterSpacing: '0.15em',
              color: 'var(--color-text-muted)',
              borderRadius: '4px',
              border: '1px solid rgba(74,74,74,0.15)',
              minHeight: '44px',
              touchAction: 'manipulation',
            }}
            aria-label="Open search"
          >
            SEARCH
          </motion.button>

          {/* STUDIO — interactive button */}
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={onStudio}
            className="px-3 py-2.5 md:px-5 md:pt-10 md:pb-[7px] cursor-pointer bg-transparent inline-flex items-center
              transition-opacity duration-200
              hover:opacity-60 focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2"
            style={{
              fontSize: '10px',
              letterSpacing: '0.15em',
              color: 'var(--color-text-muted)',
              borderRadius: '4px',
              border: '1px solid rgba(74,74,74,0.15)',
              minHeight: '44px',
              touchAction: 'manipulation',
            }}
            aria-label="Open studio page"
          >
            STUDIO
          </motion.button>
        </nav>
      )}
    </motion.header>
  )
}
