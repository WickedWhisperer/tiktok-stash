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
                    all_items.extend(data)
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
    return all_items

def normalize_items(items):
    normalized = []
    for item in items:
        normalized.append({
            "id": item.get("id") or item.get("videoMeta", {}).get("id"),
            "author": item.get("authorMeta", {}).get("name"),
            "caption": item.get("text"),
            "created_at": item.get("createTimeISO"),
            "url": item.get("webVideoUrl"),
            "stats": item.get("stats") or {
                "diggCount": item.get("diggCount", 0),
                "shareCount": item.get("shareCount", 0),
                "playCount": item.get("playCount", 0),
                "commentCount": item.get("commentCount", 0),
                "collectCount": item.get("collectCount", 0)
            },
            "music": item.get("musicMeta"),
            "duration": item.get("videoMeta", {}).get("duration"),
            "platform": item.get("platform") or "tiktok",
            "raw": item
        })
    return normalized

def remove_duplicates(items):
    seen_ids = set()
    unique_items = []
    for item in items:
        if item["id"] not in seen_ids:
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
