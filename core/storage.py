import json
import os
import subprocess
import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, Type


@dataclass
class StorageConfig:
    provider: str = "mega"
    remote_name: str = "mega"
    remote_root: str = "tiktok-archive"
    generate_public_links: bool = False


class RcloneStorageProvider:
    def __init__(self, remote_name: str = "mega", remote_root: str = "tiktok-archive"):
        self.remote_name = remote_name
        self.remote_root = remote_root.strip("/")

    def remote_file(self, relative_path: str) -> str:
        relative_path = relative_path.lstrip("/")
        if self.remote_root:
            return f"{self.remote_name}:{self.remote_root}/{relative_path}"
        return f"{self.remote_name}:{relative_path}"

    def _run(self, args):
        return subprocess.run(args, capture_output=True, text=True)

    def upload_file(self, local_path: str, relative_remote_path: str, retries: int = 3, delay: int = 5) -> bool:
        for attempt in range(retries):
            result = self._run([
                "rclone",
                "copyto",
                local_path,
                self.remote_file(relative_remote_path),
            ])

            if result.returncode == 0:
                return True

            print(f"Upload attempt {attempt + 1} failed: {result.stderr.strip()}")
            time.sleep(delay)

        return False

    def file_info(self, relative_remote_path: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        result = self._run([
            "rclone",
            "lsjson",
            "--stat",
            self.remote_file(relative_remote_path),
        ])

        if result.returncode != 0:
            return False, None, result.stderr.strip()

        raw = result.stdout.strip()
        if not raw:
            return True, None, None

        try:
            parsed = json.loads(raw)
            return True, parsed, None
        except json.JSONDecodeError:
            return True, None, None

    def verify_file(self, local_path: str, relative_remote_path: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
        exists, info, error = self.file_info(relative_remote_path)
        if not exists:
            return False, None, error

        if info and isinstance(info, dict) and os.path.exists(local_path):
            remote_size = info.get("Size")
            if remote_size is not None:
                try:
                    local_size = os.path.getsize(local_path)
                    if int(remote_size) != int(local_size):
                        return False, info, "size mismatch"
                except Exception as exc:
                    return False, info, str(exc)

        return True, info, None

    def public_link(self, relative_remote_path: str) -> Tuple[Optional[str], Optional[str]]:
        result = self._run([
            "rclone",
            "link",
            self.remote_file(relative_remote_path),
        ])

        if result.returncode != 0:
            return None, result.stderr.strip()

        lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        if not lines:
            return None, "no link returned"

        return lines[-1], None


class MegaProvider(RcloneStorageProvider):
    pass


class GoogleDriveProvider(RcloneStorageProvider):
    pass


class DropboxProvider(RcloneStorageProvider):
    pass


class S3Provider(RcloneStorageProvider):
    pass


PROVIDER_MAP: Dict[str, Type[RcloneStorageProvider]] = {
    "mega": MegaProvider,
    "drive": GoogleDriveProvider,
    "google_drive": GoogleDriveProvider,
    "gdrive": GoogleDriveProvider,
    "dropbox": DropboxProvider,
    "s3": S3Provider,
}


def get_storage_provider(storage_config: Optional[Dict] = None) -> RcloneStorageProvider:
    storage_config = storage_config or {}
    provider_name = str(storage_config.get("provider") or "mega").lower()
    remote_name = storage_config.get("remote_name") or storage_config.get("remote") or provider_name
    remote_root = storage_config.get("remote_root") or "tiktok-archive"

    provider_cls = PROVIDER_MAP.get(provider_name, RcloneStorageProvider)
    return provider_cls(remote_name=remote_name, remote_root=remote_root)
