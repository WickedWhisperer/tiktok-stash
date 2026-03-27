import json
import os
from datetime import datetime

RETRY_FILE = "archive/system/retry_queue.json"


def load_queue():
    if not os.path.exists(RETRY_FILE):
        return []

    with open(RETRY_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data

    return []


def save_queue(queue):
    os.makedirs(os.path.dirname(RETRY_FILE), exist_ok=True)
    with open(RETRY_FILE, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)


def add_to_queue(video_id, reason, error=None):
    queue = load_queue()
    now = datetime.utcnow().isoformat()

    for entry in queue:
        if entry.get("video_id") == video_id:
            entry["reason"] = reason
            entry["last_error"] = error
            entry["attempts"] = int(entry.get("attempts", 0)) + 1
            entry["last_attempt"] = now
            save_queue(queue)
            return

    queue.append({
        "video_id": video_id,
        "reason": reason,
        "last_error": error,
        "attempts": 1,
        "last_attempt": now
    })

    save_queue(queue)


def remove_from_queue(video_id):
    queue = load_queue()
    queue = [entry for entry in queue if entry.get("video_id") != video_id]
    save_queue(queue)
