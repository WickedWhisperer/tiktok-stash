from __future__ import annotations

from pathlib import Path
import requests

from .cache_manager import RecoveryCache
from .models import RecoveryCandidate, RecoveryResult
from .providers.local_provider import LocalRecoveryProvider
from .providers.wayback_provider import WaybackProvider
from .providers.pullpush_provider import PullPushProvider
from .providers.reddit_preview_provider import RedditPreviewProvider
from .providers.reveddit_provider import RevedditProvider
from ..env_config import load_settings


class RecoveryService:
    def __init__(self, save_directory: str | Path):
        self.save_directory = Path(save_directory)
        self.cfg = load_settings()
        self.cache = RecoveryCache(self.save_directory)
        self.providers = self._load_providers()

    def _load_providers(self):
        providers = []
        providers_cfg = self.cfg.get("Recovery", "providers", fallback="local,wayback,pullpush,preview,reveddit").split(",")
        providers_cfg = [p.strip().lower() for p in providers_cfg if p.strip()]
        if "local" in providers_cfg:
            providers.append(LocalRecoveryProvider(self.save_directory / "recovery_cache"))
        if "wayback" in providers_cfg:
            providers.append(WaybackProvider())
        if "pullpush" in providers_cfg:
            providers.append(PullPushProvider())
        if "preview" in providers_cfg:
            providers.append(RedditPreviewProvider())
        if "reveddit" in providers_cfg:
            providers.append(RevedditProvider())
        return providers

    def recover(self, item: dict) -> RecoveryResult:
        unique_key = str(item.get("unique_key") or item.get("id") or item.get("video_id") or "")
        cached = self.cache.get(unique_key)
        if cached:
            return RecoveryResult(unique_key, True, cached.get("url"), metadata=cached)

        candidates = []
        for url in item.get("archive_urls", []) or []:
            candidates.append(RecoveryCandidate("archive", url, metadata={"unique_key": unique_key, **item}))
        for url in [item.get("video_url"), item.get("thumbnail_url"), item.get("permalink")]:
            if url:
                candidates.append(RecoveryCandidate("direct", url, metadata={"unique_key": unique_key, **item}))

        for candidate in candidates:
            for provider in self.providers:
                try:
                    result = provider.recover(candidate)
                    if result.recovered:
                        self.cache.set(unique_key, {"url": result.url, "source": candidate.source})
                        return result
                except Exception:
                    continue

            try:
                resp = requests.head(candidate.url, allow_redirects=True, timeout=self.cfg.getint("Recovery", "timeout_seconds", fallback=15))
                if resp.ok:
                    self.cache.set(unique_key, {"url": candidate.url, "source": candidate.source})
                    return RecoveryResult(unique_key, True, candidate.url, metadata={"candidate": candidate.url})
            except Exception:
                continue

        return RecoveryResult(unique_key, False, reason="No recovery candidate succeeded")
