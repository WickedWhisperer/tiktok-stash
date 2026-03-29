from __future__ import annotations

from ..models import RecoveryCandidate, RecoveryResult
from .base_provider import RecoveryProvider


class PullPushProvider(RecoveryProvider):
    def recover(self, candidate: RecoveryCandidate) -> RecoveryResult:
        return RecoveryResult(candidate.metadata.get("unique_key", ""), False, reason="PullPush lookup not configured", metadata=candidate.metadata)
