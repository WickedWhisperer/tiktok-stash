from __future__ import annotations

import json
from pathlib import Path


class RecoveryCache:
    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.path = self.root / "recovery_cache.json"
        self.root.mkdir(parents=True, exist_ok=True)

    def load(self) -> dict:
        if self.path.exists():
            return json.loads(self.path.read_text(encoding="utf-8"))
        return {}

    def save(self, data: dict) -> None:
        self.path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def get(self, key: str):
        return self.load().get(key)

    def set(self, key: str, value) -> None:
        data = self.load()
        data[key] = value
        self.save(data)
