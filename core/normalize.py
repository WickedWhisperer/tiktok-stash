import os
import json

RAW_DIR = "archive/raw"
OUTPUT_FILE = "archive/derived/normalized_archive.json"

def load_all_raw():
    items = []

    if not os.path.exists(RAW_DIR):
        return items

    for file in os.listdir(RAW_DIR):
        if file.endswith(".json"):
            path = os.path.join(RAW_DIR, file)
            with open(path, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    items.extend(data)
                except:
                    print(f"Skipping corrupted file: {file}")

    return items

def normalize_item(item):
    return {
        "id": item.get("id"),
        "author": item.get("authorMeta", {}).get("name"),
        "author_id": item.get("authorMeta", {}).get("id"),
        "caption": item.get("text"),
        "language": item.get("textLanguage"),
        "created_at": item.get("createTimeISO"),
        "url": item.get("webVideoUrl"),
        "stats": {
            "likes": item.get("diggCount", 0),
            "shares": item.get("shareCount", 0),
            "views": item.get("playCount", 0),
            "comments": item.get("commentCount", 0),
            "favorites": item.get("collectCount", 0),
            "reposts": item.get("repostCount", 0),
        },
        "hashtags": item.get("hashtags", []),
        "mentions": item.get("mentions", []),
        "music": {
            "title": item.get("musicMeta", {}).get("musicName"),
            "author": item.get("musicMeta", {}).get("musicAuthor"),
            "is_original": item.get("musicMeta", {}).get("musicOriginal"),
        },
        "duration": item.get("videoMeta", {}).get("duration"),
        "flags": {
            "is_slideshow": item.get("isSlideshow", False),
            "is_pinned": item.get("isPinned", False),
            "is_sponsored": item.get("isSponsored", False),
        },
        "platform": "tiktok",
        "raw": item
    }

def main():
    os.makedirs("archive/derived", exist_ok=True)

    raw_items = load_all_raw()

    normalized = []
    seen_ids = set()

    for item in raw_items:
        item_id = item.get("id")
        if item_id and item_id not in seen_ids:
            normalized.append(normalize_item(item))
            seen_ids.add(item_id)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    print(f"Normalized {len(normalized)} items")

if __name__ == "__main__":
    main()
