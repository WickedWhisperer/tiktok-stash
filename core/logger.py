import json
import os
import threading
from datetime import datetime

LOG_FILE = "archive/system/log.json"
_lock = threading.Lock()


def load_log():
    if not os.path.exists(LOG_FILE):
        return []

    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []

    if isinstance(data, list):
        return data

    return []


def save_log(log_entries):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log_entries, f, ensure_ascii=False, indent=2)


def append_log(event, level="info", video_id=None, details=None):
    with _lock:
        log_entries = load_log()
        log_entries.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "event": event,
            "video_id": video_id,
            "details": details or {}
        })
        save_log(log_entries)
