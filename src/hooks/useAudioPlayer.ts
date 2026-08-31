import { useRef, useState, useCallback, useEffect } from 'react'

export function useAudioPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getOrCreateAudio = useCallback(() => {
    // 1. Init AudioContext & Analyser
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyser.connect(ctx.destination)
      audioContextRef.current = ctx
      analyserRef.current = analyser
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {})
    }

    // 2. Init persistent Audio element & connect once
    if (!audioRef.current) {
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.preload = 'auto'

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
      })
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration || 0)
        setIsLoading(false)
      })
      audio.addEventListener('ended', () => {
        setIsPlaying(false)
      })
      audio.addEventListener('error', () => {
        console.error('Audio playback error:', audio.error, 'src:', audio.src)
        setIsLoading(false)
        setIsPlaying(false)
        setPlaybackError('Audio unavailable')
      })
      audio.addEventListener('waiting', () => {
        setIsLoading(true)
      })
      audio.addEventListener('playing', () => {
        setIsLoading(false)
        setIsPlaying(true)
        setPlaybackError(null)
      })

      audioRef.current = audio

      try {
        if (audioContextRef.current && analyserRef.current) {
          const source = audioContextRef.current.createMediaElementSource(audio)
          source.connect(analyserRef.current)
          sourceRef.current = source
        }
      } catch (err) {
        console.warn('Web Audio source binding failed:', err)
      }
    }

    return audioRef.current
  }, [])

  const play = useCallback(
    (src: string) => {
      // Clear any pending fade timer
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
        fadeTimeoutRef.current = null
      }

      setPlaybackError(null)
      const audio = getOrCreateAudio()

      // Reset volume & update src
      audio.volume = 1
      if (audio.src !== src) {
        audio.src = src
        audio.load()
      }
      setIsLoading(true)

      audio.play().then(() => {
        setIsPlaying(true)
        setIsLoading(false)
      }).catch((err) => {
        console.warn('Audio play rejected:', err)
        setIsPlaying(false)
        setIsLoading(false)
      })
    },
    [getOrCreateAudio],
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      audio.volume = 1
      audio.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {})
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const stop = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
      fadeIntervalRef.current = null
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current)
      fadeTimeoutRef.current = null
    }

    const audio = audioRef.current
    if (audio) {
      fadeIntervalRef.current = setInterval(() => {
        const next = Math.max(0, audio.volume - 0.05)
        if (next > 0.01) {
          audio.volume = next
        } else {
          audio.volume = 0
          audio.pause()
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
          fadeIntervalRef.current = null
          setIsPlaying(false)
        }
      }, 15)

      fadeTimeoutRef.current = setTimeout(() => {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = null
        fadeTimeoutRef.current = null
        audio.pause()
        audio.volume = 1
        setIsPlaying(false)
      }, 350)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
    }
  }, [])

  return {
    play,
    toggle,
    stop,
    seek,
    isPlaying,
    isLoading,
    playbackError,
    currentTime,
    duration,
    analyser: analyserRef,
  }
}
