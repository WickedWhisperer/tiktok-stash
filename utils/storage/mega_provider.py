from __future__ import annotations

from pathlib import Path

from .base import StorageProvider


class MegaProvider(StorageProvider):
    def __init__(self, config):
        self.config = config

    def connect(self):
        return self

    def upload_file(self, local_path, remote_path: str):
        raise RuntimeError("MEGA provider is configured but not wired to a transport backend")

    def upload_directory(self, local_dir, remote_dir: str):
        raise RuntimeError("MEGA provider is configured but not wired to a transport backend")

    def download_file(self, remote_path: str, local_path: str | Path):
        raise RuntimeError("MEGA provider is configured but not wired to a transport backend")

    def download_directory(self, remote_dir: str, local_dir: str | Path):
        raise RuntimeError("MEGA provider is configured but not wired to a transport backend")

    def verify(self, local_path: str | Path, remote_path: str):
        return False
