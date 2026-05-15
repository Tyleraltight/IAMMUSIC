"""Download full tracks using musicdl — replaces 30s previews with complete songs."""

import os
import sys
import requests
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from musicdl import musicdl

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "audio"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TRACKS = [
    {"file": "track-1.m4a",  "query": "Charli XCX 360"},
    {"file": "track-2.m4a",  "query": "Daft Punk Get Lucky"},
    {"file": "track-3.m4a",  "query": "Frank Ocean Moon River"},
    {"file": "track-4.m4a",  "query": "Radiohead Karma Police"},
    {"file": "track-5.m4a",  "query": "Tyla Water"},
    {"file": "track-6.m4a",  "query": "Kanye West Runaway"},
    {"file": "track-7.m4a",  "query": "Tame Impala Borderline"},
    {"file": "track-8.m4a",  "query": "Kendrick Lamar HUMBLE"},
    {"file": "track-9.m4a",  "query": "Billie Eilish bad guy"},
    {"file": "track-10.m4a", "query": "The Weeknd Blinding Lights"},
    {"file": "track-11.m4a", "query": "Arctic Monkeys Do I Wanna Know"},
    {"file": "track-12.m4a", "query": "SZA Kill Bill"},
]

def main():
    client = musicdl.MusicClient(
        music_sources=["NeteaseMusicClient"],
        init_music_clients_cfg={
            "NeteaseMusicClient": {"search_size_per_source": 5}
        },
    )

    for track in TRACKS:
        outfile = OUTPUT_DIR / track["file"]
        print(f"\n{'='*60}")
        print(f"Downloading: {track['query']} -> {track['file']}")

        try:
            results = client.search(keyword=track["query"])
        except Exception as e:
            print(f"  SKIP (search failed): {e}")
            continue

        # Get first result
        items = []
        for source, songs in results.items():
            items = songs
            break

        if not items:
            print(f"  SKIP (no results)")
            continue

        item = items[0]
        download_url = getattr(item, "download_url", "")
        file_size = getattr(item, "file_size", "unknown")
        duration = getattr(item, "duration", "unknown")

        print(f"  Title: {item.song_name}")
        print(f"  Artist: {item.singers}")
        print(f"  Duration: {duration}")
        print(f"  File size: {file_size}")
        print(f"  URL: {download_url[:100]}...")

        if not download_url:
            print(f"  SKIP (no download URL)")
            continue

        # Download the full file
        try:
            resp = requests.get(
                download_url,
                headers={"User-Agent": "Mozilla/5.0"},
                stream=True,
                timeout=120,
            )
            resp.raise_for_status()

            total = 0
            with open(outfile, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1024 * 256):
                    f.write(chunk)
                    total += len(chunk)

            size_mb = total / (1024 * 1024)
            print(f"  DOWNLOADED: {size_mb:.1f} MB")

            if size_mb < 2.0:
                print(f"  WARNING: File seems too small, might be a preview!")

        except Exception as e:
            print(f"  FAILED: {e}")

    print(f"\n{'='*60}")
    print("Done! Checking files:")
    for f in sorted(OUTPUT_DIR.glob("track-*.m4a")):
        size = f.stat().st_size / (1024 * 1024)
        status = "OK" if size > 2.0 else "PREVIEW?"
        print(f"  {f.name}: {size:.1f} MB [{status}]")


if __name__ == "__main__":
    main()
