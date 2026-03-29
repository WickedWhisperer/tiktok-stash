from __future__ import annotations

from hashlib import sha256
from pathlib import Path


def hash_file(path: str | Path) -> str:
    p = Path(path)
    h = sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()
