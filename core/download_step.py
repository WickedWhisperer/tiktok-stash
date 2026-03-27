import json
from core.downloader import download_video

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"


def run():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        url = item.get("url")
        video_id = item.get("id")

        if not url or not video_id:
            continue

        local_path = download_video(url, video_id)

        item["local_video_path"] = local_path

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Downloaded videos for {len(data)} items")


if __name__ == "__main__":
    run()
