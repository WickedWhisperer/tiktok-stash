import json
import os
import time

from downloader import download_video
from uploader import upload_to_mega, generate_public_link

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"


def ensure_dirs():
    os.makedirs("archive/videos", exist_ok=True)


def load_existing():
    if not os.path.exists(OUTPUT_FILE):
        return {}
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return {item["id"]: item for item in data}


def save_output(data):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(list(data.values()), f, ensure_ascii=False, indent=2)


def main():
    ensure_dirs()

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        items = json.load(f)

    existing = load_existing()

    for item in items:
        video_id = item.get("id")
        if not video_id:
            continue

        author = item.get("author") or "unknown"
        safe_author = author.replace("/", "_")

        # Merge with existing state
        state = existing.get(video_id, item)

        state.setdefault("download_status", "pending")
        state.setdefault("upload_status", "pending")
        state.setdefault("video_storage_url", None)
        state.setdefault("local_path", None)

        # Skip fully processed
        if state["upload_status"] == "completed":
            existing[video_id] = state
            continue

        try:
            # ---------- DOWNLOAD ----------
            if state["download_status"] != "completed":
                video_url = item.get("url")
                if not video_url:
                    raise Exception("No video URL")

                local_path = f"archive/videos/{safe_author}/{video_id}.mp4"
                os.makedirs(os.path.dirname(local_path), exist_ok=True)

                download_video(video_url, local_path)

                state["download_status"] = "completed"
                state["local_path"] = local_path

            # ---------- UPLOAD ----------
            if state["upload_status"] != "completed":
                remote_path = f"tiktok-archive/{safe_author}/{video_id}.mp4"

                success = upload_to_mega(state["local_path"], remote_path)

                if not success:
                    raise Exception("Upload failed")

                link = generate_public_link(remote_path)

                state["upload_status"] = "completed"
                state["video_storage_url"] = link

                # delete local file after upload
                if os.path.exists(state["local_path"]):
                    os.remove(state["local_path"])

            existing[video_id] = state

        except Exception as e:
            print(f"Failed for {video_id}: {e}")
            state["download_status"] = state.get("download_status", "failed")
            state["upload_status"] = "failed"
            existing[video_id] = state

        save_output(existing)
        time.sleep(2)


if __name__ == "__main__":
    main()
