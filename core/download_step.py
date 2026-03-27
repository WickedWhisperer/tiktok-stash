import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.downloader import download_video
from core.uploader import upload_to_mega

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"


def process():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    enriched = []

    for item in data:
        video_id = item.get("id")
        author = item.get("author") or "unknown"

        # CLEAN AUTHOR NAME
        author = author.replace("/", "_")

        # STRUCTURED PATH
        base_path = f"archive/media/{author}/{video_id}"
        os.makedirs(base_path, exist_ok=True)

        video_path = os.path.join(base_path, "video.mp4")
        metadata_path = os.path.join(base_path, "metadata.json")

        # DOWNLOAD
        if not os.path.exists(video_path):
            success = download_video(item.get("url"), video_path)
        else:
            success = True

        if success:
            # SAVE METADATA
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(item, f, ensure_ascii=False, indent=2)

            # UPLOAD FOLDER (NOT FILE)
            remote_path = f"tiktok-archive/{author}/{video_id}"

            upload_success = upload_to_mega(base_path, remote_path)

            if upload_success:
                item["video_storage_url"] = f"{remote_path}/video.mp4"
                item["download_status"] = "uploaded"
            else:
                item["download_status"] = "upload_failed"
        else:
            item["download_status"] = "download_failed"

        enriched.append(item)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Processed {len(enriched)} items")


if __name__ == "__main__":
    process()
