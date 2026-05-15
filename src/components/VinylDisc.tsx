import { useState, useEffect, useRef } from 'react'

interface VinylDiscProps {
  cover: string
  gradient: string
  isPlaying: boolean
  size?: number
  alt?: string
  spinDuration?: number  // seconds per rotation — driven by BPM
}

export default function VinylDisc({ cover, gradient, isPlaying, size = 320, alt = '', spinDuration = 3.3 }: VinylDiscProps) {
  const [imgError, setImgError] = useState(false)
  const discRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(0)
  const lastTimeRef = useRef(0)
  const rafRef = useRef(0)

  const labelSize = size * 0.43
  const degreesPerSec = 360 / spinDuration

  // Smooth spin using rAF — no CSS animation jank on prop change
  useEffect(() => {
    const tick = (time: number) => {
      if (lastTimeRef.current > 0) {
        const dt = (time - lastTimeRef.current) / 1000
        rotationRef.current = (rotationRef.current + degreesPerSec * dt) % 360
        if (discRef.current) {
          discRef.current.style.transform = `rotate(${rotationRef.current}deg)`
        }
      }
      lastTimeRef.current = time
      rafRef.current = requestAnimationFrame(tick)
    }

    if (isPlaying) {
      lastTimeRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
    }

    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, degreesPerSec])

  return (
    <div
      ref={discRef}
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Vinyl body */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: '#111',
          boxShadow: `
            inset 0 0 0 ${size * 0.01}px rgba(255,255,255,0.03),
            inset 0 0 0 ${size * 0.08}px rgba(30,30,30,1),
            inset 0 0 0 ${size * 0.085}px rgba(255,255,255,0.05),
            inset 0 0 0 ${size * 0.15}px rgba(25,25,25,1),
            inset 0 0 0 ${size * 0.155}px rgba(255,255,255,0.04),
            inset 0 0 0 ${size * 0.22}px rgba(20,20,20,1),
            inset 0 0 0 ${size * 0.225}px rgba(255,255,255,0.03),
            inset 0 0 0 ${size * 0.29}px rgba(28,28,28,1),
            inset 0 0 0 ${size * 0.295}px rgba(255,255,255,0.04),
            inset 0 0 0 ${size * 0.34}px rgba(22,22,22,1),
            0 4px 30px rgba(0,0,0,0.3)
          `,
        }}
      />

      {/* Light reflection */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse at 35% 25%,
              rgba(255,255,255,0.08) 0%,
              transparent 50%
            )
          `,
        }}
      />

      {/* Center label (album cover) */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          width: labelSize,
          height: labelSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.3)',
        }}
      >
        {imgError ? (
          <div
            className="w-full h-full"
            style={{ background: gradient }}
          />
        ) : (
          <img
            src={cover}
            alt={alt}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Center hole */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.04,
          height: size * 0.04,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--color-bg)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
        }}
      />
    </div>
  )
}
