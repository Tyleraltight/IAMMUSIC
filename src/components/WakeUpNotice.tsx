import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE } from '../api/musicApi'

type Status = 'checking' | 'slow' | 'ready'

/**
 * Detects Render free-tier cold start (15-min idle → 30-50s boot).
 * Shows a subtle toast when the backend is waking up.
 */
export default function WakeUpNotice() {
  const [status, setStatusRaw] = useState<Status>('checking')
  const statusRef = useRef<Status>('checking')
  const setStatus = useCallback((s: Status) => { statusRef.current = s; setStatusRaw(s) }, [])

  useEffect(() => {
    if (!API_BASE) {
      setStatus('ready')
      return
    }

    const controller = new AbortController()

    fetch(`${API_BASE}/api/sources`, { signal: controller.signal })
      .then((r) => {
        if (r.ok) setStatus('ready')
        else setStatus('slow')
      })
      .catch(() => {
        // Network error — backend might be sleeping
        setStatus('slow')
      })

    // If it takes more than 3s, show the slow notice
    const slowTimer = setTimeout(() => {
      if (statusRef.current === 'checking') setStatus('slow')
    }, 3000)

    // Safety: assume ready after 45s
    const readyTimer = setTimeout(() => setStatus('ready'), 45000)

    return () => {
      controller.abort()
      clearTimeout(slowTimer)
      clearTimeout(readyTimer)
    }
  }, [setStatus])

  // Re-check every 5s when slow
  useEffect(() => {
    if (status !== 'slow') return
    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/sources`)
        .then((r) => { if (r.ok) setStatus('ready') })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [status, setStatus])

  return (
    <AnimatePresence>
      {status === 'slow' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-full"
          style={{
            background: 'rgba(26, 26, 26, 0.9)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          }}
        >
          {/* Spinning dot */}
          <div
            className="w-3 h-3 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: 'var(--color-accent)',
              animation: 'wakeup-spin 1s linear infinite',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.15em',
              color: '#F5F5F5',
              fontWeight: 400,
            }}
          >
            WAKING UP THE TURNTABLE
          </span>
          <span className="inline-flex gap-1">
            <span style={{ animation: 'wakeup-dot 1.4s ease-in-out infinite' }}>.</span>
            <span style={{ animation: 'wakeup-dot 1.4s ease-in-out 0.2s infinite' }}>.</span>
            <span style={{ animation: 'wakeup-dot 1.4s ease-in-out 0.4s infinite' }}>.</span>
          </span>

          <style>{`
            @keyframes wakeup-spin {
              to { transform: rotate(360deg); }
            }
            @keyframes wakeup-dot {
              0%, 60%, 100% { opacity: 0.2; }
              30% { opacity: 1; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
