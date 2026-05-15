import { useState, useCallback } from 'react'
import type { Album } from '../data/albums'

interface AlbumCardProps {
  album: Album
  onClick: () => void
}

export default function AlbumCard({ album, onClick }: AlbumCardProps) {
  const [imgError, setImgError] = useState(false)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }, [onClick])

  return (
    <div
      className="card-face"
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '4px',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
        backfaceVisibility: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Cover image or gradient fallback */}
      {imgError ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: album.gradient,
          }}
        />
      ) : (
        <img
          src={album.cover}
          alt={album.title}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          draggable={false}
        />
      )}

      {/* Bottom gradient for text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Album info */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
            textTransform: 'uppercase',
            marginBottom: '6px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {album.artist}
        </p>
        <p
          style={{
            fontSize: '16px',
            letterSpacing: '0.03em',
            color: '#fff',
            margin: 0,
            fontWeight: 400,
            textTransform: 'uppercase',
            lineHeight: 1.15,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {album.title}
        </p>
      </div>
    </div>
  )
}
