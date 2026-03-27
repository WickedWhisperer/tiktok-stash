import json
import os
from downloader import download_video
from tracker import is_downloaded, mark_downloaded
from uploader import upload_to_mega

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"


def main():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    enriched = []

    for item in data:
        video_id = item.get("id")
        video_url = item.get("url")
        author = item.get("author")

        cloud_url = None

        if video_id and video_url:
            if not is_downloaded(video_id):
                try:
                    # 1. Download
                    local_path = download_video(video_url, video_id, author)

                    # 2. Upload to MEGA
                    remote_path = f"{author}/{video_id}.mp4"
                    cloud_url = upload_to_mega(local_path, remote_path)

                    # 3. Delete local file
                    os.remove(local_path)

                    mark_downloaded(video_id)

                except Exception as e:
                    print(f"Failed: {video_id} → {e}")
            else:
                cloud_url = f"mega:{author}/{video_id}.mp4"

        item["video_url"] = cloud_url
        item["storage"] = "mega"

        enriched.append(item)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Enriched {len(enriched)} items")


if __name__ == "__main__":
    main()
