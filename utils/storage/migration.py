from __future__ import annotations

from pathlib import Path


def migrate_files(source_dir: str | Path, destination_dir: str | Path) -> dict:
    source_dir = Path(source_dir)
    destination_dir = Path(destination_dir)
    destination_dir.mkdir(parents=True, exist_ok=True)

    copied = 0
    for src in source_dir.rglob("*"):
        if src.is_file():
            dest = destination_dir / src.relative_to(source_dir)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(src.read_bytes())
            copied += 1
    return {"copied": copied}
