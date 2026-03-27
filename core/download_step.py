import json
import os
from datetime import datetime

from core.downloader import download_video
from core.tracker import is_downloaded, mark_downloaded

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"

MEDIA_ROOT = "archive/videos"


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def build_video_path(author, video_id):
    safe_author = (author or "unknown").replace("/", "_")
    return os.path.join(MEDIA_ROOT, safe_author, f"{video_id}.mp4")


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
        item["video_storage_url"] = None
        item["video_storage_path"] = None
        item["download_error"] = None
        item["uploaded_at"] = None

        if not video_id or not url:
            item["download_status"] = "invalid"
            enriched.append(item)
            continue

        if is_downloaded(video_id):
            item["download_status"] = "skipped"
            enriched.append(item)
            continue

        output_path = build_video_path(author, video_id)
        ensure_dir(os.path.dirname(output_path))

        try:
            success = download_video(url, output_path)

            if success and os.path.exists(output_path):
                # Upload via rclone
                remote_path = f"mega:tiktok-archive/{author}/{video_id}.mp4"

                exit_code = os.system(f'rclone copy "{output_path}" "{remote_path}"')

                if exit_code == 0:
                    item["download_status"] = "uploaded"
                    item["video_storage_path"] = remote_path
                    item["video_storage_url"] = None  # optional: fill later
                    item["uploaded_at"] = datetime.utcnow().isoformat()

                    mark_downloaded(video_id)

                    # Delete local file after upload
                    os.remove(output_path)
                else:
                    item["download_status"] = "upload_failed"
                    item["download_error"] = "rclone upload failed"

            else:
                item["download_status"] = "download_failed"
                item["download_error"] = "yt-dlp failed"

        except Exception as e:
            item["download_status"] = "error"
            item["download_error"] = str(e)

        enriched.append(item)

    ensure_dir(os.path.dirname(OUTPUT_FILE))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Enriched archive saved: {len(enriched)} items")


if __name__ == "__main__":
    main()
