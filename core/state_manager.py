import json
import os
from datetime import datetime

STATE_FILE = "archive/system/state.json"


def load_state():
    if not os.path.exists(STATE_FILE):
        return {}

    with open(STATE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


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
    for vid in state:
        if vid not in current_ids:
            state[vid]["is_available"] = False
