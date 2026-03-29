from __future__ import annotations

from ..models import RecoveryCandidate, RecoveryResult
from .base_provider import RecoveryProvider


class RedditPreviewProvider(RecoveryProvider):
    def recover(self, candidate: RecoveryCandidate) -> RecoveryResult:
        return RecoveryResult(candidate.metadata.get("unique_key", ""), False, reason="Preview lookup not configured", metadata=candidate.metadata)
