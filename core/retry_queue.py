import json
import os

RETRY_FILE = "archive/system/retry_queue.json"


def load_queue():
    if not os.path.exists(RETRY_FILE):
        return []
    with open(RETRY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_queue(queue):
    os.makedirs(os.path.dirname(RETRY_FILE), exist_ok=True)
    with open(RETRY_FILE, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)


def add_to_queue(video_id, reason):
    queue = load_queue()

    if not any(q["id"] == video_id for q in queue):
        queue.append({
            "id": video_id,
            "reason": reason
        })

    save_queue(queue)


def remove_from_queue(video_id):
    queue = load_queue()
    queue = [q for q in queue if q["id"] != video_id]
    save_queue(queue)
