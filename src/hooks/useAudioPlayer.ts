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

  // B3: refs for stop() timers so we can cancel previous ones
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initAudio = useCallback(() => {
    // B4: check for null OR closed state
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      analyserRef.current.connect(audioContextRef.current.destination)
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  // Stable listener refs for proper cleanup
  const listenersRef = useRef<{
    timeupdate: (() => void) | null
    loadedmetadata: (() => void) | null
    ended: (() => void) | null
  }>({ timeupdate: null, loadedmetadata: null, ended: null })

  const play = useCallback(
    (src: string) => {
      initAudio()

      // Clean up previous source with proper listener references
      if (audioRef.current) {
        audioRef.current.pause()
        const l = listenersRef.current
        if (l.timeupdate) audioRef.current.removeEventListener('timeupdate', l.timeupdate)
        if (l.loadedmetadata) audioRef.current.removeEventListener('loadedmetadata', l.loadedmetadata)
        if (l.ended) audioRef.current.removeEventListener('ended', l.ended)
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }

      const audio = new Audio(src)
      audio.crossOrigin = 'anonymous'
      audioRef.current = audio
      setIsLoading(true)

      // Connect to analyser
      if (audioContextRef.current && analyserRef.current) {
        sourceRef.current =
          audioContextRef.current.createMediaElementSource(audio)
        sourceRef.current.connect(analyserRef.current)
      }

      const onTimeUpdate = () => setCurrentTime(audio.currentTime)
      const onLoadedMetadata = () => {
        setDuration(audio.duration)
        setIsLoading(false)
      }
      const onEnded = () => setIsPlaying(false)
      const onError = () => {
        console.error('Audio load error:', audio.error, 'src:', src)
        setIsLoading(false)
        setIsPlaying(false)
      }

      audio.addEventListener('timeupdate', onTimeUpdate)
      audio.addEventListener('loadedmetadata', onLoadedMetadata)
      audio.addEventListener('ended', onEnded)
      audio.addEventListener('error', onError)

      listenersRef.current = {
        timeupdate: onTimeUpdate,
        loadedmetadata: onLoadedMetadata,
        ended: onEnded,
      }

      // B5: catch autoplay policy rejections
      audio.play().catch((err) => {
        console.warn('Audio play rejected:', err)
        setIsPlaying(false)
      })
      setIsPlaying(true)
    },
    [initAudio],
  )

  const toggle = useCallback(() => {
    if (!audioRef.current) return

    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const stop = useCallback(() => {
    // B3: clear any previous fade timers before starting a new one
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
      fadeIntervalRef.current = null
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current)
      fadeTimeoutRef.current = null
    }

    if (audioRef.current) {
      const audio = audioRef.current
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
      }
      // B4: set ref to null so initAudio() will create a fresh context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      // B3: clear any lingering timers
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
    currentTime,
    duration,
    analyser: analyserRef,
  }
}
