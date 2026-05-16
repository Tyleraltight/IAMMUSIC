import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { albums as defaultAlbums, resolveAlbumUrls } from './data/albums'
import type { Album } from './data/albums'
import { API_BASE } from './api/musicApi'
import NavHeader from './components/NavHeader'
import AlbumGrid from './components/AlbumGrid'
import PlayerView from './components/PlayerView'
import SearchBar from './components/SearchBar'
import PlaybackMode from './components/PlaybackMode'
import type { PlayMode } from './components/PlaybackMode'
import StudioPage from './components/StudioPage'
import WakeUpNotice from './components/WakeUpNotice'

const MODE_CYCLE: PlayMode[] = ['sequential', 'shuffle', 'loop']

export default function App() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [extraAlbums, setExtraAlbums] = useState<Album[]>([])
  const [playbackMode, setPlaybackMode] = useState<PlayMode>('sequential')
  const [searchOpen, setSearchOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)

  // Fade out the HTML loading screen once React has mounted
  useEffect(() => {
    const el = document.getElementById('loading-screen')
    if (el) {
      el.classList.add('fade-out')
      const timer = setTimeout(() => el.remove(), 700)
      return () => clearTimeout(timer)
    }
  }, [])

  const allAlbums = [...resolveAlbumUrls(defaultAlbums, API_BASE), ...extraAlbums]

  const handleSelect = useCallback((album: Album) => {
    setSelectedAlbum(album)
  }, [])

  const handleBack = useCallback(() => {
    if (studioOpen) {
      setStudioOpen(false)
    } else {
      setSelectedAlbum(null)
    }
  }, [studioOpen])

  const handleAddAlbum = useCallback((album: Album) => {
    setExtraAlbums((prev) => {
      if (prev.some((a) => a.id === album.id)) return prev
      return [album, ...prev]
    })
    setSelectedAlbum(album)
    setSearchOpen(false)
  }, [])

  const handleCycleMode = useCallback(() => {
    setPlaybackMode((prev) => {
      const idx = MODE_CYCLE.indexOf(prev)
      return MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]
    })
  }, [])

  // Prev / Next navigation — respects playback mode
  const currentIndex = selectedAlbum
    ? allAlbums.findIndex((a) => a.id === selectedAlbum.id)
    : -1

  const handlePrev = useCallback(() => {
    if (playbackMode === 'shuffle') {
      if (allAlbums.length <= 1) return
      let rand: number
      do { rand = Math.floor(Math.random() * allAlbums.length) } while (rand === currentIndex)
      setSelectedAlbum(allAlbums[rand])
    } else {
      if (currentIndex > 0) setSelectedAlbum(allAlbums[currentIndex - 1])
    }
  }, [currentIndex, allAlbums, playbackMode])

  const handleNext = useCallback(() => {
    if (playbackMode === 'shuffle') {
      if (allAlbums.length <= 1) return
      let rand: number
      do { rand = Math.floor(Math.random() * allAlbums.length) } while (rand === currentIndex)
      setSelectedAlbum(allAlbums[rand])
    } else if (playbackMode === 'loop') {
      const next = (currentIndex + 1) % allAlbums.length
      setSelectedAlbum(allAlbums[next])
    } else {
      // sequential
      if (currentIndex < allAlbums.length - 1) setSelectedAlbum(allAlbums[currentIndex + 1])
    }
  }, [currentIndex, allAlbums, playbackMode])

  const hasPrev = playbackMode === 'shuffle'
    ? allAlbums.length > 1
    : currentIndex > 0
  const hasNext = playbackMode === 'shuffle'
    ? allAlbums.length > 1
    : playbackMode === 'loop'
      ? allAlbums.length > 1
      : currentIndex >= 0 && currentIndex < allAlbums.length - 1

  return (
    <div className="w-full h-full relative">
      <NavHeader
        showBack={!!selectedAlbum || studioOpen}
        onBack={handleBack}
        onSearch={() => setSearchOpen(true)}
        onStudio={() => setStudioOpen(true)}
      />

      {/* Backend cold-start detection */}
      <WakeUpNotice />

      {/* AlbumGrid stays mounted — avoids remount/re-entry jank */}
      <AlbumGrid
        albums={allAlbums}
        onSelect={handleSelect}
        hidden={!!selectedAlbum}
      />

      <AnimatePresence>
        {selectedAlbum && (
          <PlayerView
            key={`player-${selectedAlbum.id}`}
            album={selectedAlbum}
            onBack={handleBack}
            onPrev={handlePrev}
            onNext={handleNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        )}
      </AnimatePresence>

      {/* Playback mode toggle — bottom right, always visible */}
      {!selectedAlbum && (
        <PlaybackMode mode={playbackMode} onCycle={handleCycleMode} />
      )}

      {/* Search overlay — triggered by NavHeader SEARCH */}
      <SearchBar open={searchOpen} onOpenChange={setSearchOpen} onAddAlbum={handleAddAlbum} />

      {/* Studio page — triggered by NavHeader STUDIO */}
      <AnimatePresence>
        {studioOpen && (
          <StudioPage open={studioOpen} onClose={() => setStudioOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
