from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from ..models import RecoveryCandidate, RecoveryResult
from .base_provider import RecoveryProvider


class LocalRecoveryProvider(RecoveryProvider):
    def __init__(self, cache_dir: str | Path):
        self.cache_dir = Path(cache_dir)

    def recover(self, candidate: RecoveryCandidate) -> RecoveryResult:
        parsed = urlparse(candidate.url)
        if parsed.scheme == "file":
            path = Path(parsed.path)
            if path.exists():
                return RecoveryResult(candidate.metadata.get("unique_key", ""), True, candidate.url, metadata=candidate.metadata)
        cached = self.cache_dir / Path(parsed.path).name
        if cached.exists():
            return RecoveryResult(candidate.metadata.get("unique_key", ""), True, cached.as_uri(), metadata=candidate.metadata)
        return RecoveryResult(candidate.metadata.get("unique_key", ""), False, reason="not found", metadata=candidate.metadata)
