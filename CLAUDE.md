# Vinyl Player

A vinyl record playback website inspired by [unveal.fr](https://unveal.fr) — 3D perspective gallery with diagonal layout and real music search/streaming via Netease Cloud Music.

## Tech Stack

- **Frontend**: React 18 + TypeScript 5 + Vite 8 + TailwindCSS 4
- **Backend**: Python FastAPI + musicdl + httpx
- **Animation**: GSAP (use `stagger` instead of manual delay, `autoAlpha` instead of `opacity`)
- **Package Manager**: pnpm (frontend), pip (backend)

## Architecture

```
Browser  ── /api/search?q=... ──►  Vite proxy (:5173)  ──►  FastAPI (:8000)
                                                                    │
                                                             musicdl_service.py
                                                                    │
                                                         musicdl.MusicClient
                                                                    │
                                                         NeteaseCloudMusic API
                                                                    │
                                                               JSON results

Browser  ── /api/stream?url=... ──►  Vite proxy  ──►  FastAPI stream (Range 206)
Browser  ── /api/cover?url=...  ──►  Vite proxy  ──►  FastAPI cover proxy
```

## Backend (`backend/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app — 4 endpoints: `/api/search`, `/api/stream`, `/api/cover`, `/api/sources` |
| `musicdl_service.py` | Wrapper around `musicdl` library. `TrackResult` dataclass, `MusicDLService.search()` with NeteaseMusicClient |
| `requirements.txt` | fastapi, uvicorn, musicdl, httpx, pydantic |

### Backend Endpoints

- **`GET /api/search?q=<query>`** — Search Netease Cloud Music, returns `TrackResult[]`
- **`GET /api/stream?url=<encoded_url>`** — Proxy audio stream with Range-header support (206 Partial Content), 64KB chunks
- **`GET /api/cover?url=<encoded_url>`** — Proxy cover images, 24h cache
- **`GET /api/sources`** — List available music sources

### Starting Backend

```bash
cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Frontend Structure

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root — manages `selectedAlbum`, `extraAlbums` (from search), renders Grid/Player/SearchBar |
| `src/components/AlbumGrid.tsx` | **Main gallery** — 3D Cover Flow style layout, drag/scroll to browse |
| `src/components/AlbumCard.tsx` | Individual card — cover image, hover/selected states |
| `src/components/PlayerView.tsx` | Full-screen player for selected album |
| `src/components/PlaybackControls.tsx` | Play/pause/seek UI |
| `src/components/VinylDisc.tsx` | Animated vinyl disc visual |
| `src/components/SoundRipples.tsx` | Audio-reactive ripple animation |
| `src/components/SearchBar.tsx` | Bottom-right search overlay, 600ms debounce, converts `TrackResult` → `Album` |
| `src/components/NavHeader.tsx` | Top nav bar with back button |
| `src/hooks/useAudioPlayer.ts` | AudioContext + AnalyserNode (fftSize 256), play/toggle/stop/seek |
| `src/api/musicApi.ts` | Frontend API client — `searchTracks()`, `getStreamUrl()`, `getCoverUrl()` |
| `src/data/albums.ts` | Static catalog of 41 albums (12 original + 10 Ty1er playlist + 19 Jazz playlist) |

## 3D Gallery Design (AlbumGrid)

### Layout Parameters (current working state)

```
ORIGIN_X:   18vw      (active card anchor, left side)
ORIGIN_Y:   22vh      (active card anchor, upper area)
STEP_X:     13vw      (horizontal offset per card, ~50% revealed)
STEP_Y:     -4vh      (vertical offset per card, upward diagonal)
Z_STEP:     -120px    (depth spacing)
rotateY:    -25deg    (cards rotate into space)
rotateX:    3deg      (slight forward tilt)
perspectiveOrigin: 80% 20% (vanishing point, upper-right)
```

### Opacity Rule

- Cards 0-8: full opacity (1.0)
- Cards 9-10: gradual fade (0.7, 0.4)
- Last 1-2 cards: near-transparent (0.15)

### Drag UX

- Drag up → see later cards (progress increases)
- Drag down → return to earlier cards (progress decreases)
- Mouse wheel same direction
- Touch supported with inertia/momentum
- 5px threshold distinguishes drag from click

## Key Design Decisions

1. **Cards are NOT scaled down** — CSS perspective handles size naturally; depth is conveyed by overlap/occlusion, not manual `scale()`
2. **Cover Flow style** — Like a stack of glass panes fanned out diagonally, each card reveals a narrow edge of the next
3. **Real music data** — Backend searches Netease Cloud Music via `musicdl`; frontend converts results to `Album` objects via `SearchBar`
4. **All covers are real** — Downloaded from Apple Music CDN for the 12 default albums

## Agent Memory

### Using agent-browser
**CRITICAL**: When using `agent-browser` or Playwright to analyze external websites, ALWAYS save results to a file using the `filename` parameter. Do NOT let large page snapshots flood back into conversation context — this causes context window overflow (1M+ tokens). Hard-learned lesson from analyzing unveil.fr.

### unveil.fr
- Domain is **offline** as of 2026-05-14 (Google DNS returns NXDOMAIN)
- The site used a 3D Cover Flow gallery with perspective, drag-to-scroll, and cards fanned diagonally from bottom-left to top-right
- Do NOT attempt to access it again

## UX Guidelines (Default Standards)

Derived from Vercel Web Interface Guidelines + ui-ux-pro-max. **Always follow these when writing UI code.**

### Accessibility (CRITICAL)
- Icon-only buttons MUST have `aria-label`
- Interactive elements MUST have keyboard handlers
- Use semantic HTML: `<button>` for actions, `<a>`/`<Link>` for navigation, `<nav>` for navigation groups
- NEVER use `<div onClick>` — use `<button>` instead
- Images need `alt` text; decorative SVGs need `aria-hidden="true"`
- Headings must follow h1→h6 hierarchy
- Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- ALWAYS respect `prefers-reduced-motion` — use the `useReducedMotion()` hook in `src/hooks/useReducedMotion.ts`

### Animation
- Micro-interactions: 150–300ms; complex transitions ≤ 400ms; NEVER exceed 500ms
- ONLY animate `transform` and `opacity` — NEVER animate `width/height/top/left`
- NEVER use `transition: all` — list properties explicitly
- Use `ease-out` for entering, `ease-in` for exiting
- Exit animations should be ~60–70% of enter duration
- Stagger list/grid items by 30–50ms per item
- Animations must be interruptible — user tap/gesture cancels in-progress animation

### Touch & Interaction
- Minimum touch target: 44×44px (Apple) / 48×48dp (Material)
- Minimum spacing between targets: 8px
- Apply `touch-action: manipulation` to prevent 300ms tap delay
- Use `overscroll-behavior: contain` in modals/overlays
- Don't rely on hover alone — all interactions need tap/click equivalents

### Typography
- Use `…` (U+2026) NOT `...` (three periods)
- Use curly quotes `"` `"` not straight `"`
- Body text minimum 16px on mobile
- Line-height 1.5–1.75 for body text
- Use `font-variant-numeric: tabular-nums` for number columns
- Use `text-wrap: balance` on headings

### Focus States
- ALL interactive elements need visible focus indicators
- NEVER use `outline: none` without a `focus-visible` replacement
- Prefer `:focus-visible` over `:focus` to avoid showing ring on click

### Performance
- Lists with 50+ items MUST be virtualized
- Avoid `getBoundingClientRect` in rAF loops — cache via ResizeObserver
- Batch DOM reads then writes — never interleave
- Use `loading="lazy"` for below-fold images
- Declare `width`/`height` on `<img>` to prevent CLS

### Dark Mode
- Set `color-scheme: dark` on `<html>` for dark themes
- `<meta name="theme-color">` must match page background
- Use semantic color tokens, not raw hex in components

### Navigation
- Back navigation must be predictable; preserve scroll/state
- Destructive actions need confirmation or undo window
- URL should reflect state (filters, tabs, pagination)

## VPN Note

External API calls (Apple Music CDN, Netease) require VPN on this machine. If downloads fail, user needs to enable VPN first.
