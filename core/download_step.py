import json
import os

from core.downloader import download_video
from core.tracker import is_downloaded, mark_downloaded
from core.uploader import upload_file, build_remote_path, generate_public_link

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"


def load_config():
    with open("config/settings.json") as f:
        return json.load(f)


def run():
    config = load_config()

    provider = config["storage"]["provider"]
    delete_local = config["storage"]["delete_local_after_upload"]
    structured = config["storage"]["structured_paths"]
    generate_links = config["storage"]["generate_public_links"]

    retries = config["download"]["retries"]

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    enriched = []

    for item in data:
        video_id = item.get("id")
        url = item.get("url")
        author = item.get("author") or "unknown"

        if not video_id or not url:
            continue

        if is_downloaded(video_id):
            enriched.append(item)
            continue

        print(f"Processing: {video_id}")

        # DOWNLOAD
        local_path = download_video(url, video_id, author, retries=retries)

        if not local_path:
            item["download_failed"] = True
            enriched.append(item)
            continue

        # UPLOAD
        remote_path = build_remote_path(provider, author, video_id)
        success = upload_file(local_path, remote_path)

        if success:
            mark_downloaded(video_id)

            item["cloud_path"] = remote_path

            if generate_links:
                item["public_url"] = generate_public_link(remote_path)

            if delete_local:
                os.remove(local_path)

        else:
            item["upload_failed"] = True

        enriched.append(item)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Enriched archive saved → {OUTPUT_FILE}")


if __name__ == "__main__":
    run()
