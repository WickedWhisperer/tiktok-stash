from __future__ import annotations

import shutil
from pathlib import Path

from .base import StorageProvider


class LocalProvider(StorageProvider):
    def __init__(self, config):
        self.config = config

    def connect(self):
        return self

    def _mirror_root(self) -> Path:
        return Path(self.config.local_mirror_directory).expanduser().resolve()

    def upload_file(self, local_path, remote_path: str):
        local_path = Path(local_path)
        dest = self._mirror_root() / remote_path.lstrip("/")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local_path, dest)
        return {"uploaded": 1, "remote_path": str(dest)}

    def upload_directory(self, local_dir, remote_dir: str):
        local_dir = Path(local_dir)
        count = 0
        for src in local_dir.rglob("*"):
            if src.is_file():
                rel = src.relative_to(local_dir).as_posix()
                self.upload_file(src, f"{remote_dir.strip('/')}/{rel}")
                count += 1
        return {"uploaded": count}

    def download_file(self, remote_path: str, local_path):
        src = self._mirror_root() / remote_path.lstrip("/")
        local_path = Path(local_path)
        local_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, local_path)
        return {"downloaded": 1}

    def download_directory(self, remote_dir: str, local_dir):
        remote_root = self._mirror_root() / remote_dir.lstrip("/")
        local_dir = Path(local_dir)
        copied = 0
        if remote_root.exists():
            for src in remote_root.rglob("*"):
                if src.is_file():
                    dest = local_dir / src.relative_to(remote_root)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dest)
                    copied += 1
        return {"downloaded": copied}

    def verify(self, local_path, remote_path: str):
        local_path = Path(local_path)
        remote = self._mirror_root() / remote_path.lstrip("/")
        return remote.exists() and remote.stat().st_size == local_path.stat().st_size
