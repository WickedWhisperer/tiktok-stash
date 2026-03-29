from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class StorageProvider(ABC):
    @abstractmethod
    def connect(self):
        raise NotImplementedError

    @abstractmethod
    def upload_file(self, local_path: str | Path, remote_path: str):
        raise NotImplementedError

    @abstractmethod
    def upload_directory(self, local_dir: str | Path, remote_dir: str):
        raise NotImplementedError

    @abstractmethod
    def download_file(self, remote_path: str, local_path: str | Path):
        raise NotImplementedError

    @abstractmethod
    def download_directory(self, remote_dir: str, local_dir: str | Path):
        raise NotImplementedError

    @abstractmethod
    def verify(self, local_path: str | Path, remote_path: str):
        raise NotImplementedError
