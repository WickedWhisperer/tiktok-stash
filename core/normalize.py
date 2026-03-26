import json
import os

ARCHIVE_DIR = "archive"
OUTPUT_FILE = os.path.join(ARCHIVE_DIR, "normalized_archive.json")


def extract_text_list(value):
    if value is None:
        return []

    if isinstance(value, str):
        return [value]

    if isinstance(value, dict):
        candidate = (
            value.get("name")
            or value.get("title")
            or value.get("text")
            or value.get("username")
            or value.get("id")
        )
        return [str(candidate)] if candidate else []

    if isinstance(value, list):
        out = []
        for item in value:
            if isinstance(item, dict):
                candidate = (
                    item.get("name")
                    or item.get("title")
                    or item.get("text")
                    or item.get("username")
                    or item.get("id")
                )
                if candidate:
                    out.append(str(candidate))
            elif item is not None:
                out.append(str(item))
        return out

    return []


def load_all_json_files(directory):
    all_items = []

    if not os.path.exists(directory):
        return all_items

    for filename in sorted(os.listdir(directory)):
        # Only consume raw collector outputs
        if not (filename.startswith("tiktok_") and filename.endswith(".json")):
            continue

        path = os.path.join(directory, filename)

        with open(path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                continue

        if isinstance(data, list):
            all_items.extend(data)
        elif isinstance(data, dict):
            all_items.append(data)

    return all_items


def normalize_items(items):
    normalized = []

    for item in items:
        if not isinstance(item, dict):
            continue

        raw_author = item.get("authorMeta", {})
        raw_music = item.get("musicMeta", {})
        raw_video = item.get("videoMeta", {})

        normalized.append({
            "id": item.get("id"),
            "author": raw_author.get("name"),
            "author_id": raw_author.get("id"),
            "author_avatar": raw_author.get("avatar") or raw_author.get("originalAvatarUrl"),
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
            "hashtags": extract_text_list(item.get("hashtags")),
            "mentions": extract_text_list(item.get("mentions")),
            "music": {
                "title": raw_music.get("musicName"),
                "author": raw_music.get("musicAuthor"),
                "is_original": raw_music.get("musicOriginal"),
            },
            "duration": raw_video.get("duration"),
            "flags": {
                "is_slideshow": item.get("isSlideshow", False),
                "is_pinned": item.get("isPinned", False),
                "is_sponsored": item.get("isSponsored", False),
            },
            "platform": "tiktok",
            "raw": item
        })

    return normalized


def remove_duplicates(items):
    seen_ids = set()
    unique_items = []

    for item in items:
        item_id = item.get("id")
        if item_id and item_id not in seen_ids:
            unique_items.append(item)
            seen_ids.add(item_id)

    return unique_items


def main():
    all_items = load_all_json_files(ARCHIVE_DIR)
    normalized = normalize_items(all_items)
    unique_items = remove_duplicates(normalized)

    os.makedirs(ARCHIVE_DIR, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unique_items, f, ensure_ascii=False, indent=2)

    print(f"Normalized archive created: {OUTPUT_FILE} ({len(unique_items)} items)")


if __name__ == "__main__":
    main()
