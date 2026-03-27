import json
import os
from datetime import datetime

from core.downloader import download_video
from core.tracker import is_downloaded, mark_downloaded
from core.uploader import upload_file, file_exists
from core.logger import log_event

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"

LOCAL_ROOT = "archive/videos"
REMOTE_ROOT = "mega:tiktok-archive"


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def build_paths(author, video_id):
    safe_author = (author or "unknown").replace("/", "_")

    local_video = os.path.join(LOCAL_ROOT, safe_author, f"{video_id}.mp4")
    local_meta = os.path.join(LOCAL_ROOT, safe_author, f"{video_id}.json")

    remote_video = f"{REMOTE_ROOT}/{safe_author}/videos"
    remote_meta = f"{REMOTE_ROOT}/{safe_author}/metadata"

    return local_video, local_meta, remote_video, remote_meta


def save_metadata(path, item):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(item, f, ensure_ascii=False, indent=2)


def main():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    enriched = []

    for item in data:
        video_id = item.get("id")
        url = item.get("url")
        author = item.get("author")

        item["download_status"] = "pending"
        item["video_storage_path"] = None
        item["video_storage_url"] = None
        item["uploaded_at"] = None
        item["is_available"] = True

        if not video_id or not url:
            item["download_status"] = "invalid"
            enriched.append(item)
            continue

        local_video, local_meta, remote_video, remote_meta = build_paths(author, video_id)

        ensure_dir(os.path.dirname(local_video))

        # Skip if already tracked
        if is_downloaded(video_id):
            item["download_status"] = "skipped"
            enriched.append(item)
            continue

        try:
            success = download_video(url, local_video)

            if not success or not os.path.exists(local_video):
                item["download_status"] = "download_failed"
                item["is_available"] = False
                log_event(video_id, "download_failed")
                enriched.append(item)
                continue

            # Save metadata locally
            save_metadata(local_meta, item)

            # Upload video
            video_uploaded = upload_file(local_video, remote_video)

            # Upload metadata
            meta_uploaded = upload_file(local_meta, remote_meta)

            if video_uploaded and meta_uploaded:
                item["download_status"] = "uploaded"
                item["video_storage_path"] = f"{remote_video}/{video_id}.mp4"
                item["uploaded_at"] = datetime.utcnow().isoformat()

                mark_downloaded(video_id)
                log_event(video_id, "uploaded")

                os.remove(local_video)
                os.remove(local_meta)
            else:
                item["download_status"] = "upload_failed"
                log_event(video_id, "upload_failed")

        except Exception as e:
            item["download_status"] = "error"
            item["is_available"] = False
            log_event(video_id, "error", str(e))

        enriched.append(item)

    ensure_dir(os.path.dirname(OUTPUT_FILE))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Processed {len(enriched)} items")


if __name__ == "__main__":
    main()
