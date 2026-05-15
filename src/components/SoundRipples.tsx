import { useRef, useEffect } from 'react'

interface SoundRipplesProps {
  analyser: React.RefObject<AnalyserNode | null>
  isPlaying: boolean
  vinylSize: number
  bpm?: number
  vinylElRef?: React.RefObject<HTMLDivElement | null>
}

interface Ring {
  age: number
  maxLife: number
  expandRate: number
}

export default function SoundRipples({
  analyser,
  isPlaying,
  vinylSize,
  bpm = 100,
}: SoundRipplesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // ResizeObserver — update canvas when parent size changes
    const observer = new ResizeObserver(() => {
      resizeCanvas()
    })
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement)
    }
    resizeCanvas()

    // BPM → timing
    const beatDuration = 60000 / bpm  // ms per beat
    const beatThreshold = beatDuration * 0.5  // min ms between beats
    const ringLifetime = beatDuration * 4  // rings last ~4 beats

    // Beat detection state
    const rings: Ring[] = []
    let lastBeatTime = 0
    let lastRingSpawnTime = 0
    let prevBassEnergy = 0
    let smoothBassEnergy = 0
    const beatIntervals: number[] = []

    const draw = (_timestamp: number) => {
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      const centerX = w / 2
      const centerY = h / 2

      // Get actual vinyl radius from cached parent size or prop
      const vinylRadius = vinylSize / 2

      const maxExpansion = Math.max(w, h) * 0.55

      ctx.clearRect(0, 0, w, h)

      // ── Audio analysis ────────────────────────────────
      let bassEnergy = 0
      const currentAnalyser = analyser.current

      if (isPlaying && currentAnalyser) {
        const dataArray = new Uint8Array(currentAnalyser.frequencyBinCount)
        currentAnalyser.getByteFrequencyData(dataArray)
        const bassSlice = dataArray.slice(0, 10)
        bassEnergy =
          bassSlice.reduce((a, b) => a + b, 0) / bassSlice.length / 255

        // Low-pass filter for smooth visual response
        smoothBassEnergy += (bassEnergy - smoothBassEnergy) * 0.25
      } else {
        // Gentle idle breathing
        smoothBassEnergy = (Math.sin(Date.now() / 3000) + 1) * 0.06
        bassEnergy = smoothBassEnergy
      }

      // ── Draw vinyl base ───────────────────────────────
      ctx.beginPath()
      ctx.arc(centerX, centerY, vinylRadius + smoothBassEnergy * 6, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(253, 191, 247, ${0.08 + smoothBassEnergy * 0.15})`
      ctx.fill()

      // Outer energy glow
      if (smoothBassEnergy > 0.1) {
        const glowRadius = vinylRadius + 20 + smoothBassEnergy * 30
        const gradient = ctx.createRadialGradient(
          centerX, centerY, vinylRadius,
          centerX, centerY, glowRadius,
        )
        gradient.addColorStop(0, `rgba(253, 191, 247, ${smoothBassEnergy * 0.2})`)
        gradient.addColorStop(1, 'rgba(253, 191, 247, 0)')
        ctx.beginPath()
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // ── Beat detection ────────────────────────────────
      const now = performance.now()
      const bassRising = bassEnergy > prevBassEnergy + 0.03
      const aboveThreshold = bassEnergy > 0.12
      const timeSinceLastBeat = now - lastBeatTime

      if (
        isPlaying &&
        bassRising &&
        aboveThreshold &&
        timeSinceLastBeat > beatThreshold
      ) {
        // Beat detected
        if (lastBeatTime > 0 && timeSinceLastBeat < 3000) {
          beatIntervals.push(timeSinceLastBeat)
          if (beatIntervals.length > 12) beatIntervals.shift()
        }
        lastBeatTime = now

        // Spawn beat ring with throttle
        const throttle = Math.max(200, Math.min(800, beatDuration * 0.6))
        if (now - lastRingSpawnTime > throttle) {
          lastRingSpawnTime = now
          const travelTime = Math.max(1200, Math.min(3000, beatDuration * 4))
          const expandRate = maxExpansion / (travelTime / 16.67)
          rings.push({
            age: 0,
            maxLife: ringLifetime,
            expandRate: expandRate * (0.9 + Math.random() * 0.2),
          })
        }
      }
      prevBassEnergy = bassEnergy

      // ── Update & draw beat rings ──────────────────────
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        ring.age++

        const t = ring.age / ring.maxLife
        const currentRadius = vinylRadius + ring.age * ring.expandRate
        const alpha = Math.max(0, 0.35 * (1 - t * t))

        if (alpha <= 0 || currentRadius > maxExpansion * 1.5) {
          rings.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(74, 74, 74, ${alpha})`
        ctx.lineWidth = 1.5 * (1 - t * 0.6)
        ctx.stroke()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [analyser, isPlaying, vinylSize, bpm])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  )
}
