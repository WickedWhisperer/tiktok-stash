import json
import os

ARCHIVE_DIR = "archive"
OUTPUT_FILE = os.path.join(ARCHIVE_DIR, "normalized_archive.json")


def load_all_json_files(directory):
    all_items = []
    for filename in os.listdir(directory):
        if filename.endswith(".json") and not filename.startswith("normalized"):
            path = os.path.join(directory, filename)
            with open(path, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)

                    # Handle both list and dict cases safely
                    if isinstance(data, list):
                        all_items.extend(data)
                    elif isinstance(data, dict):
                        all_items.append(data)

                except Exception as e:
                    print(f"Error reading {filename}: {e}")
    return all_items


def normalize_items(items):
    normalized = []

    for item in items:
        if not isinstance(item, dict):
            continue  # skip broken entries safely

        normalized.append({
            "id": item.get("id"),

            "author": item.get("authorMeta", {}).get("name"),
            "author_id": item.get("authorMeta", {}).get("id"),

            "caption": item.get("text"),
            "language": item.get("textLanguage"),

            "created_at": item.get("createTimeISO") or item.get("createTime"),

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

            # Always keep raw for future upgrades
            "raw": item
        })

    return normalized


def remove_duplicates(items):
    seen_ids = set()
    unique_items = []

    for item in items:
        if item["id"] and item["id"] not in seen_ids:
            unique_items.append(item)
            seen_ids.add(item["id"])

    return unique_items


def main():
    all_items = load_all_json_files(ARCHIVE_DIR)
    normalized = normalize_items(all_items)
    unique_items = remove_duplicates(normalized)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unique_items, f, ensure_ascii=False, indent=2)

    print(f"Normalized archive created: {OUTPUT_FILE} ({len(unique_items)} items)")


if __name__ == "__main__":
    main()
