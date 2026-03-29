from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class RecoveryCandidate:
    source: str
    url: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RecoveryResult:
    unique_key: str
    recovered: bool
    url: str | None = None
    reason: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
