from __future__ import annotations

from abc import ABC, abstractmethod
from ..models import RecoveryCandidate, RecoveryResult


class RecoveryProvider(ABC):
    @abstractmethod
    def recover(self, candidate: RecoveryCandidate) -> RecoveryResult:
        raise NotImplementedError
