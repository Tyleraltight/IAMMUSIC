"""Fast music search service using third-party APIs.

Uses vkeys.cn for NetEase search (fast, returns covers),
and meting API as fallback for audio URL resolution.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, asdict
from typing import Any
from urllib.parse import quote

import requests


@dataclass
class TrackResult:
    id: str
    title: str
    artist: str
    album: str
    duration: float
    source: str
    cover_url: str
    play_url: str
    quality: str
    song_id: str = ""  # NetEase song ID for on-demand URL resolution

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class FastMusicService:
    """Fast music search using vkeys.cn + meting API fallback."""

    def __init__(self) -> None:
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://music.163.com/",
        })

    def search(self, keyword: str, limit: int = 10) -> list[TrackResult]:
        """Search NetEase Cloud Music. Returns results in ~1s with covers."""
        # Primary: vkeys.cn API (fast, returns covers + song IDs)
        results = self._search_vkeys(keyword, limit)
        if results:
            return results

        # Fallback: direct NetEase search API (fast, but no cover URLs)
        return self._search_netease_direct(keyword, limit)

    def _search_vkeys(self, keyword: str, limit: int) -> list[TrackResult]:
        """Search via vkeys.cn aggregator API."""
        try:
            url = f"https://api.vkeys.cn/v2/music/netease?word={quote(keyword)}&num={limit}"
            resp = self._session.get(url, timeout=8)
            data = resp.json()
            if data.get("code") != 200:
                return []
        except Exception:
            return []

        results: list[TrackResult] = []
        for item in data.get("data", []):
            song_name = item.get("song", "")
            artist = item.get("singer", "")
            album_name = item.get("album", "")
            cover_url = item.get("cover", "")
            if cover_url:
                cover_url = cover_url.replace("http://", "https://")
            song_id = str(item.get("id", ""))
            duration_s = item.get("duration", 0)

            uid = hashlib.md5(f"netease:{song_name}:{artist}".encode()).hexdigest()[:12]

            results.append(TrackResult(
                id=f"NeteaseMusicClient_{uid}",
                title=song_name,
                artist=artist,
                album=album_name,
                duration=float(duration_s) if duration_s else 0,
                source="NeteaseMusicClient",
                cover_url=cover_url,
                play_url="",
                quality="mp3",
                song_id=song_id,
            ))

        return results

    def _search_netease_direct(self, keyword: str, limit: int) -> list[TrackResult]:
        """Fallback: direct NetEase search API. Covers fetched via meting API."""
        try:
            url = f"https://music.163.com/api/search/get?s={quote(keyword)}&type=1&limit={limit}"
            resp = self._session.get(url, timeout=8)
            data = resp.json()
        except Exception:
            return []

        songs = data.get("result", {}).get("songs", [])

        # Collect song IDs for batch cover resolution
        song_ids = [str(s.get("id", "")) for s in songs]
        covers = self._get_covers_batch(song_ids)

        results: list[TrackResult] = []
        for song in songs:
            song_name = song.get("name", "")
            artists = "/".join([a.get("name", "") for a in song.get("artists", [])])
            album_obj = song.get("album", {})
            album_name = album_obj.get("name", "")
            song_id = str(song.get("id", ""))
            duration_ms = song.get("duration", 0)

            uid = hashlib.md5(f"netease:{song_name}:{artists}".encode()).hexdigest()[:12]

            results.append(TrackResult(
                id=f"NeteaseMusicClient_{uid}",
                title=song_name,
                artist=artists,
                album=album_name,
                duration=duration_ms / 1000.0 if duration_ms else 0,
                source="NeteaseMusicClient",
                cover_url=covers.get(song_id, ""),
                play_url="",
                quality="mp3",
                song_id=song_id,
            ))

        return results

    def _get_covers_batch(self, song_ids: list[str]) -> dict[str, str]:
        """Get cover URLs for multiple songs via meting API."""
        covers: dict[str, str] = {}
        for sid in song_ids[:10]:  # limit to avoid slow requests
            try:
                url = f"https://api.qijieya.cn/meting/?type=song&id={sid}"
                resp = self._session.get(url, timeout=5)
                data = resp.json()
                if isinstance(data, list) and data:
                    pic = data[0].get("pic", "")
                    if pic:
                        covers[sid] = pic.replace("http://", "https://")
            except Exception:
                pass
        return covers

    def get_play_url(self, song_id: str) -> str | None:
        """Get a playable audio URL for a NetEase song ID.

        Tries meting API first (works for most songs including VIP),
        falls back to direct player API.
        """
        # Method 1: Meting API (follows redirect to actual CDN)
        try:
            url = f"https://api.qijieya.cn/meting/?server=netease&type=url&id={song_id}"
            resp = self._session.head(url, allow_redirects=True, timeout=8)
            final_url = resp.url
            if final_url and "music.126.net" in final_url:
                return final_url
        except Exception:
            pass

        # Method 2: Direct NetEase player API (works for free songs)
        try:
            url = f"https://music.163.com/api/song/enhance/player/url?ids=[{song_id}]&br=320000"
            resp = self._session.get(url, timeout=8)
            data = resp.json()
            for s in data.get("data", []):
                if str(s.get("id")) == song_id and s.get("url"):
                    return s["url"]
        except Exception:
            pass

        return None


# Module-level singleton
service = FastMusicService()
