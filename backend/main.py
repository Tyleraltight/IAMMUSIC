"""FastAPI backend — proxies musicdl searches and streams audio/cover art."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import unquote

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from musicdl_service import service  # FastMusicService — no more musicdl

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

_http_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _http_client
    _http_client = httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(60.0, connect=10.0),
        headers={"User-Agent": "Mozilla/5.0"},
    )
    yield
    if _http_client:
        await _http_client.aclose()
        _http_client = None


app = FastAPI(title="Vinyl Player API", lifespan=lifespan)

# CORS — Vite dev server origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "https://tyleraltight.github.io",
    ],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_client() -> httpx.AsyncClient:
    if _http_client is None:
        raise HTTPException(503, "HTTP client not initialised")
    return _http_client


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1, description="Search keyword"),
    limit: int = Query(10, ge=1, le=50),
):
    """Search NeteaseMusic for tracks matching *q*."""
    try:
        results = await asyncio.to_thread(service.search, q, limit)
    except Exception as exc:
        raise HTTPException(502, f"musicdl search failed: {exc}") from exc

    return {
        "results": [r.to_dict() for r in results],
        "query": q,
        "total": len(results),
    }


@app.api_route("/api/stream", methods=["GET", "HEAD"])
async def stream_audio(request: Request, url: str = Query(..., description="Remote audio URL")):
    """Proxy a remote audio stream with range-request support.

    The browser sends Range headers when seeking; we must forward them
    to the upstream CDN and return 206 Partial Content so the <audio>
    element can seek without downloading the entire file first.
    """
    decoded_url = unquote(url)
    client = _get_client()

    # Forward the Range header if the browser sent one
    upstream_headers: dict[str, str] = {"User-Agent": "Mozilla/5.0"}
    range_header = request.headers.get("range")
    if range_header:
        upstream_headers["Range"] = range_header

    try:
        resp = await client.send(
            client.build_request("GET", decoded_url, headers=upstream_headers),
            stream=True,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Upstream fetch failed: {exc}") from exc

    if resp.status_code >= 400 and resp.status_code != 206:
        await resp.aclose()
        raise HTTPException(resp.status_code, "Upstream returned error")

    content_type = resp.headers.get("content-type", "audio/mpeg")
    # Strip charset from audio content-type (some CDNs incorrectly add it)
    if "audio" in content_type and "charset" in content_type:
        content_type = content_type.split(";")[0].strip()
    content_length = resp.headers.get("content-length")
    content_range = resp.headers.get("content-range")
    accept_ranges = resp.headers.get("accept-ranges", "bytes")

    response_headers: dict[str, str] = {
        "Accept-Ranges": accept_ranges,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
    }
    if content_length:
        response_headers["Content-Length"] = content_length
    if content_range:
        response_headers["Content-Range"] = content_range

    status = resp.status_code

    async def stream_chunks():
        try:
            async for chunk in resp.aiter_bytes(chunk_size=65_536):
                yield chunk
        finally:
            await resp.aclose()

    return StreamingResponse(
        stream_chunks(),
        status_code=status,
        media_type=content_type,
        headers=response_headers,
    )


@app.get("/api/cover")
async def proxy_cover(url: str = Query(..., description="Remote cover image URL")):
    """Proxy a remote album-cover image with streaming."""
    decoded_url = unquote(url)
    client = _get_client()

    try:
        resp = await client.send(
            client.build_request("GET", decoded_url),
            stream=True,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Upstream fetch failed: {exc}") from exc

    if resp.status_code >= 400:
        await resp.aclose()
        raise HTTPException(resp.status_code, "Upstream returned error")

    content_type = resp.headers.get("content-type", "image/jpeg")
    content_length = resp.headers.get("content-length")

    headers: dict[str, str] = {
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
    }
    if content_length:
        headers["Content-Length"] = content_length

    async def stream_chunks():
        try:
            async for chunk in resp.aiter_bytes(chunk_size=65_536):
                yield chunk
        finally:
            await resp.aclose()

    return StreamingResponse(
        stream_chunks(),
        status_code=200,
        media_type=content_type,
        headers=headers,
    )


# Path to the frontend's public/covers directory
_COVERS_DIR = Path(__file__).resolve().parent.parent / "public" / "covers"


@app.get("/api/local-cover")
async def serve_local_cover(name: str = Query(..., description="Cover filename e.g. album-2.jpg")):
    """Serve a local cover image from public/covers/."""
    # Prevent path traversal
    safe_name = Path(name).name
    cover_path = _COVERS_DIR / safe_name
    if not cover_path.is_file():
        raise HTTPException(404, f"Cover not found: {safe_name}")
    return FileResponse(cover_path, media_type="image/jpeg", cache_control="public, max-age=86400")


@app.get("/api/sources")
async def list_sources():
    return {
        "sources": [
            {"name": "NeteaseMusicClient", "label": "NetEase Music", "available": True},
        ]
    }


# ---------------------------------------------------------------------------
# Dynamic song stream by NetEase song ID
# ---------------------------------------------------------------------------

# Cache: song_id -> (play_url, timestamp)  — refresh every 30 min
_song_url_cache: dict[str, tuple[str, float]] = {}

import time as _time


@app.api_route("/api/song/{song_id}", methods=["GET", "HEAD"])
async def stream_by_song_id(request: Request, song_id: str):
    """Resolve a NetEase song ID to a fresh play URL and proxy the stream.

    This avoids hardcoding expiring CDN URLs.  The URL is cached for 30 min
    so repeated plays of the same song don't hit the NetEase API every time.
    """
    client = _get_client()
    now = _time.time()

    # Check cache
    cached = _song_url_cache.get(song_id)
    play_url: str | None = None
    if cached and (now - cached[1]) < 1800:  # 30 min TTL
        play_url = cached[0]

    if not play_url:
        # Fetch fresh URL using fast service (tries player API + meting fallback)
        try:
            resolved = await asyncio.to_thread(service.get_play_url, song_id)
            if resolved:
                play_url = resolved
                _song_url_cache[song_id] = (play_url, now)
        except Exception as exc:
            raise HTTPException(502, f"Failed to resolve song {song_id}: {exc}") from exc

    if not play_url:
        raise HTTPException(404, f"No playable URL for song {song_id} (may be region-locked or VIP-only)")

    # Now proxy the stream (same logic as /api/stream)
    upstream_headers: dict[str, str] = {"User-Agent": "Mozilla/5.0"}
    range_header = request.headers.get("range")
    if range_header:
        upstream_headers["Range"] = range_header

    try:
        resp = await client.send(
            client.build_request("GET", play_url, headers=upstream_headers),
            stream=True,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Upstream fetch failed: {exc}") from exc

    if resp.status_code >= 400 and resp.status_code != 206:
        await resp.aclose()
        raise HTTPException(resp.status_code, "Upstream returned error")

    content_type = resp.headers.get("content-type", "audio/mpeg")
    # Strip charset from audio content-type (some CDNs incorrectly add it)
    if "audio" in content_type and "charset" in content_type:
        content_type = content_type.split(";")[0].strip()
    content_length = resp.headers.get("content-length")
    content_range = resp.headers.get("content-range")
    accept_ranges = resp.headers.get("accept-ranges", "bytes")

    response_headers: dict[str, str] = {
        "Accept-Ranges": accept_ranges,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
    }
    if content_length:
        response_headers["Content-Length"] = content_length
    if content_range:
        response_headers["Content-Range"] = content_range

    status = resp.status_code

    async def stream_chunks():
        try:
            async for chunk in resp.aiter_bytes(chunk_size=65_536):
                yield chunk
        finally:
            await resp.aclose()

    return StreamingResponse(
        stream_chunks(),
        status_code=status,
        media_type=content_type,
        headers=response_headers,
    )
