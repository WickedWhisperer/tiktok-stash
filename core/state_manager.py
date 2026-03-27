import json
import os
from datetime import datetime

STATE_FILE = "archive/system/state.json"


def load_state():
    if not os.path.exists(STATE_FILE):
        return {}

    with open(STATE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        return data

    return {}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def update_video(state, video_id, data):
    state[video_id] = {
        **state.get(video_id, {}),
        **data,
        "last_updated": datetime.utcnow().isoformat()
    }


def mark_deleted_missing(state, current_ids):
    now = datetime.utcnow().isoformat()
    for video_id in list(state.keys()):
        if video_id not in current_ids:
            state[video_id] = {
                **state.get(video_id, {}),
                "is_available": False,
                "last_updated": now
            }
