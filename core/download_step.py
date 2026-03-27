import json
import os
from core.downloader import download_video
from core.tracker import is_downloaded, mark_downloaded

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"


def run():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated = 0

    for item in data:
        video_id = item.get("id")
        url = item.get("url")

        if not video_id or not url:
            continue

        # Skip already downloaded
        if is_downloaded(video_id):
            item["video_storage_url"] = f"archive/media/{video_id}.mp4"
            item["download_status"] = "skipped"
            continue

        print(f"Downloading: {video_id}")

        path = download_video(url, video_id)

        if path:
            item["video_storage_url"] = path
            item["download_status"] = "success"
            mark_downloaded(video_id)
            updated += 1
        else:
            item["video_storage_url"] = None
            item["download_status"] = "failed"

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Downloaded {updated} new videos")


if __name__ == "__main__":
    run()
