/**
 * API client for the music backend.
 *
 * All requests go through Vite's /api proxy in dev, so no CORS issues.
 */

export interface TrackResult {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  source: string
  cover_url: string
  play_url: string
  quality: string
  song_id: string  // NetEase song ID for on-demand streaming
}

export async function searchTracks(
  query: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<TrackResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const res = await fetch(`/api/search?${params}`, { signal })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const data = await res.json()
  return data.results as TrackResult[]
}

/** Returns a proxied URL that streams audio by NetEase song ID (recommended). */
export function getSongStreamUrl(songId: string): string {
  return `/api/song/${songId}`
}

/** Returns a proxied URL that streams the remote audio through our backend. */
export function getStreamUrl(playUrl: string): string {
  return `/api/stream?url=${encodeURIComponent(playUrl)}`
}

/** Returns a proxied URL for a remote cover image. */
export function getCoverUrl(coverUrl: string): string {
  return `/api/cover?url=${encodeURIComponent(coverUrl)}`
}
