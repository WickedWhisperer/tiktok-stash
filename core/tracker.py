from core.state_manager import load_state, save_state, update_video


def is_downloaded(video_id):
    state = load_state()
    entry = state.get(str(video_id), {})
    return entry.get("upload_status") == "completed"


def mark_downloaded(video_id):
    state = load_state()
    update_video(state, str(video_id), {
        "download_status": "completed",
        "upload_status": "completed",
        "is_available": True
    })
    save_state(state)
