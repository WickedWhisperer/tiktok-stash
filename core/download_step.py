import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.downloader import download_video
from core.uploader import upload_to_mega
from core.state_manager import (
    load_state,
    save_state,
    update_video,
    mark_deleted_missing
)

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"


def file_valid(path):
    return os.path.exists(path) and os.path.getsize(path) > 50 * 1024


def process():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    state = load_state()
    current_ids = set()
    enriched = []

    for item in data:
        video_id = item.get("id")
        author = (item.get("author") or "unknown").replace("/", "_")

        current_ids.add(video_id)

        existing = state.get(video_id, {})

        base_path = f"archive/videos/{author}/{video_id}"
        os.makedirs(base_path, exist_ok=True)

        video_path = os.path.join(base_path, "video.mp4")
        metadata_path = os.path.join(base_path, "metadata.json")

        # --- SKIP IF ALREADY COMPLETE ---
        if existing.get("upload_status") == "completed":
            item["video_storage_url"] = existing.get("video_storage_url")
            item["download_status"] = "skipped"
            enriched.append(item)
            continue

        # --- DOWNLOAD ---
        if not file_valid(video_path):
            success = download_video(item.get("url"), video_path)

            if not success or not file_valid(video_path):
                update_video(state, video_id, {
                    "download_status": "failed",
                    "upload_status": "pending"
                })
                item["download_status"] = "failed"
                enriched.append(item)
                continue

        # --- SAVE METADATA ---
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(item, f, ensure_ascii=False, indent=2)

        # --- UPLOAD ---
        remote_path = f"tiktok-archive/{author}/{video_id}"

        upload_success = upload_to_mega(base_path, remote_path)

        if upload_success:
            storage_url = f"{remote_path}/video.mp4"

            update_video(state, video_id, {
                "download_status": "completed",
                "upload_status": "completed",
                "video_storage_url": storage_url,
                "is_available": True
            })

            item["video_storage_url"] = storage_url
            item["download_status"] = "completed"
            item["upload_status"] = "completed"

            # optional cleanup
            try:
                os.remove(video_path)
            except:
                pass

        else:
            update_video(state, video_id, {
                "download_status": "completed",
                "upload_status": "failed"
            })

            item["download_status"] = "upload_failed"
            item["upload_status"] = "failed"

        enriched.append(item)

    # --- DELETION DETECTION ---
    mark_deleted_missing(state, current_ids)

    save_state(state)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Processed {len(enriched)} items")


if __name__ == "__main__":
    process()
