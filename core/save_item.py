import os
import json
from datetime import datetime

ARCHIVE_DIR = "archive/raw"

def save_items(items):
    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"run_{timestamp}.json"

    path = os.path.join(ARCHIVE_DIR, filename)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Saved raw data to {path}")

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        raise Exception("Usage: python save_item.py <input_file>")

    input_file = sys.argv[1]

    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    save_items(data)
