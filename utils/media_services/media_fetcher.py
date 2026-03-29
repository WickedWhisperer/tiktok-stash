from __future__ import annotations

from pathlib import Path
import requests

from ..url_security import is_safe_url, safe_filename


def fetch_media(url: str, dest_dir: str | Path, name_hint: str) -> Path:
    if not is_safe_url(url):
        raise ValueError(f"Unsafe media URL: {url}")
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(url.split("?", 1)[0]).suffix or ".bin"
    path = dest_dir / f"{safe_filename(name_hint)}{suffix}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    path.write_bytes(response.content)
    return path
