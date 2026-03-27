import json
import os
from datetime import datetime

LOG_FILE = "archive/system/sync_log.json"


def load_log():
    if not os.path.exists(LOG_FILE):
        return []

    with open(LOG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_log(log):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2)


def log_event(video_id, status, message=None):
    log = load_log()

    log.append({
        "video_id": video_id,
        "status": status,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    })

    save_log(log)
