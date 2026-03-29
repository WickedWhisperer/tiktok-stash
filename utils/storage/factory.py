from __future__ import annotations

from dataclasses import dataclass

from ..env_config import load_settings


@dataclass
class StorageConfig:
    provider: str
    local_dir: str
    remote_directory: str
    local_mirror_directory: str
    verify_after_upload: bool = True


def load_storage_config() -> StorageConfig:
    cfg = load_settings()
    return StorageConfig(
        provider=cfg.get("Storage", "provider", fallback="local").lower(),
        local_dir=cfg.get("Settings", "save_directory", fallback="tiktok/"),
        remote_directory=cfg.get("Storage", "remote_directory", fallback="/tiktok"),
        local_mirror_directory=cfg.get("Storage", "local_mirror_directory", fallback="mirror/"),
        verify_after_upload=cfg.getboolean("Storage", "verify_after_upload", fallback=True),
    )


def get_storage_provider(config: StorageConfig):
    if config.provider == "local":
        from .local_provider import LocalProvider
        return LocalProvider(config)
    if config.provider == "mega":
        from .mega_provider import MegaProvider
        return MegaProvider(config)
    raise SystemExit(f"Unknown storage provider: {config.provider}")
