import { useRef, useEffect, useCallback, useState } from 'react'
import type { Album } from '../data/albums'
import AlbumCard from './AlbumCard'

interface AlbumGridProps {
  albums: Album[]
  onSelect: (album: Album) => void
  hidden?: boolean
}

/*
 * FLIP-BOOK 3D GALLERY — unveil.fr style
 *
 * Cards are ALL THE SAME SIZE. No manual scale.
 * CSS perspective handles natural foreshortening.
 * Cards overlap like a fanned deck of cards or flip-book pages.
 * Each card peeks out slightly from behind the one in front.
 *
 * Key: depth comes from OCCLUSION, not shrinkage.
 */

/* ──────── Card size (uniform for all cards) ──────── */
const CARD_W = 26 // vw
const CARD_H = 34 // vw

/* ──────── 3D Scene ──────── */
const PERSPECTIVE = 3000
const PERSPECTIVE_ORIGIN = '80% 20%' // vanishing point upper-right

/* ──────── Card rotation (all cards same tilt) ──────── */
const ROTATE_Y = -25 // degrees — tilted side-on
const ROTATE_X = 3   // slight forward tilt

/* ──────── Depth / stacking ──────── */
const Z_ACTIVE = 200    // active card pops forward

/* ──────── XY offset per card step (flip-book reveal) ──────── */
// Each card shifts LEFT and UP — reveal ~50% of the card behind
const STEP_X = 13  // vw — 26vw card, 13vw visible per step → ~50% revealed
const STEP_Y = -4  // vh — diagonal climb (stronger than before for fan feel)

/* ──────── Active card position ──────── */
const ORIGIN_X = 18 // vw from left — active card shifted left for room
const ORIGIN_Y = 22 // vh from top — centered vertically

/* ──────── Depth / stacking constants ──────── */
const Z_STEP = -120  // Z step between cards — balanced depth

/* ──────── Opacity decay ──────── */
const OPACITY_FULL_RANGE = 4 // nearby cards stay full opacity

export default function AlbumGrid({ albums, onSelect, hidden }: AlbumGridProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const cardElsRef = useRef<Map<number, HTMLDivElement>>(new Map())

  const scrollTarget = useRef(0)
  const scrollSmooth = useRef(0)

  const isDragging = useRef(false)
  const hasDragged = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragStartProgress = useRef(0)
  const lastDragTime = useRef(0)
  const velocity = useRef(0)
  const momentumRaf = useRef(0)
  const rafRef = useRef(0)

  const totalCards = albums.length
  const maxIndex = totalCards - 1

  const hiddenRef = useRef(false)
  hiddenRef.current = !!hidden

  const registerCard = useCallback((el: HTMLDivElement | null, i: number) => {
    if (el) cardElsRef.current.set(i, el)
    else cardElsRef.current.delete(i)
  }, [])

  /* ──── Drag / Wheel interaction ──── */
  useEffect(() => {
    const clamp = (v: number) => Math.max(0, Math.min(1, v))

    const DRAG_SENSITIVITY = 1.0 / (window.innerHeight * 3)
    const WHEEL_SENSITIVITY = 0.0006

    /* --- Wheel --- */
    const handleWheel = (e: WheelEvent) => {
      if (hiddenRef.current) return
      e.preventDefault()
      cancelMomentum()
      // Scroll down (deltaY > 0) → go backward (toward front)
      // Scroll up (deltaY < 0) → go forward (deeper into stack)
      scrollTarget.current = clamp(
        scrollTarget.current - (e.deltaY * WHEEL_SENSITIVITY + e.deltaX * WHEEL_SENSITIVITY * 0.3)
      )
    }

    /* --- Mouse drag --- */
    const DRAG_THRESHOLD = 4

    const handleMouseDown = (e: MouseEvent) => {
      if (hiddenRef.current) return
      // Allow drag from cards too (except buttons/links)
      if ((e.target as HTMLElement).closest('button, a')) return
      isDragging.current = true
      hasDragged.current = false
      dragStart.current = { x: e.clientX, y: e.clientY }
      dragStartProgress.current = scrollTarget.current
      lastDragTime.current = performance.now()
      velocity.current = 0
      cancelMomentum()
      document.body.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y

      if (!hasDragged.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        hasDragged.current = true
      }

      // Natural scroll: drag DOWN → content moves down → see earlier cards (progress↓)
      //                  drag UP → content moves up → see later cards (progress↑)
      const newProgress = clamp(
        dragStartProgress.current + (-dy * DRAG_SENSITIVITY) + (dx * DRAG_SENSITIVITY * 0.2)
      )

      const now = performance.now()
      const dt = now - lastDragTime.current
      if (dt > 0) {
        velocity.current = (newProgress - scrollTarget.current) / dt * 1000
      }
      lastDragTime.current = now
      scrollTarget.current = newProgress
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''

      if (hasDragged.current) {
        const block = (ev: MouseEvent) => {
          ev.stopPropagation()
          ev.preventDefault()
          window.removeEventListener('click', block, true)
        }
        window.addEventListener('click', block, true)
      }

      if (Math.abs(velocity.current) > 0.03) startMomentum()
    }

    const handleMouseLeave = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
      }
    }

    /* --- Touch --- */
    const handleTouchStart = (e: TouchEvent) => {
      if (hiddenRef.current) return
      isDragging.current = true
      hasDragged.current = false
      dragStart.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
      dragStartProgress.current = scrollTarget.current
      lastDragTime.current = performance.now()
      velocity.current = 0
      cancelMomentum()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return
      e.preventDefault()

      const dx = e.touches[0]!.clientX - dragStart.current.x
      const dy = e.touches[0]!.clientY - dragStart.current.y

      if (!hasDragged.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        hasDragged.current = true
      }

      const newProgress = clamp(
        dragStartProgress.current + (-dy * DRAG_SENSITIVITY) + (dx * DRAG_SENSITIVITY * 0.2)
      )

      const now = performance.now()
      const dt = now - lastDragTime.current
      if (dt > 0) {
        velocity.current = (newProgress - scrollTarget.current) / dt * 1000
      }
      lastDragTime.current = now
      scrollTarget.current = newProgress
    }

    const handleTouchEnd = () => {
      isDragging.current = false

      if (hasDragged.current) {
        const block = (ev: MouseEvent) => {
          ev.stopPropagation()
          ev.preventDefault()
          window.removeEventListener('click', block, true)
        }
        window.addEventListener('click', block, true)
      }

      if (Math.abs(velocity.current) > 0.03) startMomentum()
    }

    /* --- Momentum --- */
    function cancelMomentum() {
      if (momentumRaf.current) {
        cancelAnimationFrame(momentumRaf.current)
        momentumRaf.current = 0
      }
    }

    function startMomentum() {
      let last = performance.now()
      const decay = () => {
        const now = performance.now()
        const dt = (now - last) / 1000
        last = now
        velocity.current *= Math.pow(0.05, dt)
        scrollTarget.current = clamp(scrollTarget.current + velocity.current * dt)
        if (Math.abs(velocity.current) > 0.005) {
          momentumRaf.current = requestAnimationFrame(decay)
        } else {
          velocity.current = 0
        }
      }
      momentumRaf.current = requestAnimationFrame(decay)
    }

    /* --- Register listeners --- */
    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      cancelMomentum()
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  /* ──── Animation loop ──── */
  useEffect(() => {
    const tick = () => {
      // Smooth interpolation
      if (!isDragging.current) {
        scrollSmooth.current += (scrollTarget.current - scrollSmooth.current) * 0.08
      } else {
        scrollSmooth.current = scrollTarget.current
      }

      const activeIndex = scrollSmooth.current * maxIndex

      // Update each card's 3D transform
      cardElsRef.current.forEach((el, i) => {
        const d = i - activeIndex // signed distance from active card
        const absD = Math.abs(d)

        /*
         * CORE: No manual scale!
         * Cards stay same size. CSS perspective handles foreshortening.
         * Only Z, XY offsets and opacity change per card.
         */

        // Z: active card pops forward, each step goes deeper
        const z = Z_ACTIVE + d * Z_STEP

        // XY: each deeper card shifts right and up (flip-book reveal)
        const tx = ORIGIN_X + d * STEP_X  // vw
        const ty = ORIGIN_Y + d * STEP_Y  // vh

        // Opacity: full for nearby cards, fade only on last 2-3
        const opacity = absD <= OPACITY_FULL_RANGE
          ? 1
          : Math.max(0.15, 1 - (absD - OPACITY_FULL_RANGE) * 0.3)

        // z-index: nearer cards on top
        const zIndex = 500 - Math.round(d * 10)

        el.style.transform =
          `translate(${tx}vw, ${ty}vh) translateZ(${z}px) rotateY(${ROTATE_Y}deg) rotateX(${ROTATE_X}deg)`
        el.style.opacity = String(opacity)
        el.style.zIndex = String(zIndex)
        // No filter — keep cards sharp, perspective does the depth work
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [maxIndex])

  /* ──── Entrance fade (wrapper-level, no per-card transform conflict) ──── */
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <>
      {/* 3D Scene */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          perspective: `${PERSPECTIVE}px`,
          perspectiveOrigin: PERSPECTIVE_ORIGIN,
          zIndex: 10,
          cursor: hidden ? 'default' : 'grab',
          pointerEvents: hidden ? 'none' : 'auto',
          opacity: entered && !hidden ? 1 : 0,
          transition: hidden
            ? 'opacity 0.15s ease-out'
            : 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* preserve-3d wrapper */}
        <div
          ref={wrapperRef}
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
          }}
        >
          {albums.map((album, i) => (
            <div
              key={album.id}
              ref={(el) => registerCard(el, i)}
              style={{
                position: 'absolute',
                width: `${CARD_W}vw`,
                height: `${CARD_H}vw`,
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity',
              }}
            >
              <AlbumCard
                album={album}
                onClick={() => onSelect(album)}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
