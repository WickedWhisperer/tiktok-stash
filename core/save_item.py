import json
import os
from datetime import datetime

ARCHIVE_DIR = "archive"

def save_item(item):
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    # Create unique filename per run
    filename = f"tiktok_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.json"
    path = os.path.join(ARCHIVE_DIR, filename)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(item, f, ensure_ascii=False, indent=2)

    print(f"Saved: {filename}")
