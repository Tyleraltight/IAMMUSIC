import { motion } from 'framer-motion'

interface StudioPageProps {
  open: boolean
  onClose: () => void
}

const EMAIL = 'chuzihang456@gmail.com'
const GITHUB_URL = 'https://github.com/Tyleraltight'
const GITHUB_HANDLE = '@Tyleraltight'

export default function StudioPage({ open, onClose }: StudioPageProps) {
  if (!open) return null

  return (
    <motion.div
      className="fixed inset-0 z-[60]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Background */}
      <button
        className="absolute inset-0 bg-[var(--color-bg)]"
        onClick={onClose}
        aria-label="Close studio page"
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        style={{ cursor: 'default' }}
      />

      {/* Back arrow — top-left, matches NavHeader's BACK button style */}
      <motion.button
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="fixed top-0 left-0 z-[61] flex items-center gap-2 cursor-pointer bg-transparent p-0 border-none
          transition-opacity duration-200
          hover:opacity-60 focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2"
        style={{
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: 'var(--color-text)',
          padding: '8px 14px',
          borderRadius: '4px',
          border: '1px solid var(--color-border)',
          minHeight: '44px',
          touchAction: 'manipulation',
          margin: '8px',
        }}
        aria-label="Close studio"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M8 1L3 6L8 11" stroke="currentColor" strokeWidth="1" />
        </svg>
        BACK
      </motion.button>

      {/* Content */}
      <div
        className="relative z-10 flex flex-col justify-between h-full"
        style={{ padding: 'clamp(80px, 12vh, 140px) clamp(24px, 8vw, 120px)' }}
      >
        {/* Top section: page title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        >
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '0.2em',
              color: 'var(--color-text-muted)',
            }}
          >
            STUDIO
          </span>
        </motion.div>

        {/* Middle section: contact info */}
        <div className="flex flex-col gap-[clamp(40px,6vh,80px)]">
          {/* Email row */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: 'var(--color-text-muted)',
              }}
            >
              EMAIL
            </span>
            <a
              href={`mailto:${EMAIL}`}
              className="group inline-flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2 rounded-sm"
              style={{
                fontSize: 'clamp(20px, 3.5vw, 36px)',
                fontWeight: 300,
                letterSpacing: '0.02em',
                color: 'var(--color-text)',
                textDecoration: 'none',
                lineHeight: 1.2,
                transition: 'opacity 0.25s ease',
                touchAction: 'manipulation',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.55' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              {EMAIL}
              <svg
                width="clamp(16px, 2vw, 24px)"
                height="clamp(16px, 2vw, 24px)"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{
                  opacity: 0.4,
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                  flexShrink: 0,
                }}
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
            style={{
              height: '1px',
              background: 'var(--color-border)',
              transformOrigin: 'left',
              maxWidth: '480px',
            }}
          />

          {/* GitHub row */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          >
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: 'var(--color-text-muted)',
              }}
            >
              GITHUB
            </span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-yellow-300/40 focus-visible:ring-offset-2 rounded-sm"
              style={{
                fontSize: 'clamp(20px, 3.5vw, 36px)',
                fontWeight: 300,
                letterSpacing: '0.02em',
                color: 'var(--color-text)',
                textDecoration: 'none',
                lineHeight: 1.2,
                transition: 'opacity 0.25s ease',
                touchAction: 'manipulation',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.55' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              {GITHUB_HANDLE}
              <svg
                width="clamp(16px, 2vw, 24px)"
                height="clamp(16px, 2vw, 24px)"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{
                  opacity: 0.4,
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                  flexShrink: 0,
                }}
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </motion.div>
        </div>

        {/* Bottom section: decorative note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
          style={{
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: 'var(--color-text-muted)',
            opacity: 0.5,
          }}
        >
          VINYL PLAYER &copy; {new Date().getFullYear()}
        </motion.div>
      </div>
    </motion.div>
  )
}
