import os
import json

ARCHIVE_DIR = "archive"


def save_item(item):
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    file_path = os.path.join(ARCHIVE_DIR, f"{item['id']}.json")

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(item, f, indent=2, ensure_ascii=False)
