import json
import os

RAW_DIR = "archive/raw"
OUTPUT_FILE = "archive/derived/normalized_archive.json"


def extract_text_list(value):
    if value is None:
        return []

    if isinstance(value, str):
        value = value.strip()
        return [value] if value else []

    if isinstance(value, dict):
        candidate = (
            value.get("name")
            or value.get("title")
            or value.get("text")
            or value.get("username")
            or value.get("id")
        )
        if candidate:
            return [str(candidate)]
        return []

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
                text = str(item).strip()
                if text:
                    out.append(text)
        return out

    return []


def load_all_raw():
    items = []

    if not os.path.exists(RAW_DIR):
        return items

    for file in sorted(os.listdir(RAW_DIR)):
        if not file.endswith(".json"):
            continue

        path = os.path.join(RAW_DIR, file)

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Skipping unreadable raw file {file}: {e}")
            continue

        if isinstance(data, list):
            items.extend(data)
        elif isinstance(data, dict):
            items.append(data)

    return items


def normalize_item(item):
    author_meta = item.get("authorMeta", {}) or {}
    music_meta = item.get("musicMeta", {}) or {}
    video_meta = item.get("videoMeta", {}) or {}

    hashtags = extract_text_list(item.get("hashtags"))
    mentions = extract_text_list(item.get("mentions"))

    return {
        "id": item.get("id"),
        "author": author_meta.get("name"),
        "author_id": author_meta.get("id"),
        "author_avatar": author_meta.get("avatar") or author_meta.get("originalAvatarUrl"),
        "author_profile": author_meta.get("profileUrl"),
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
        "hashtags": hashtags,
        "mentions": mentions,
        "detailed_mentions": item.get("detailedMentions", []),
        "music": {
            "id": music_meta.get("musicId"),
            "title": music_meta.get("musicName"),
            "author": music_meta.get("musicAuthor"),
            "is_original": music_meta.get("musicOriginal"),
            "album": music_meta.get("musicAlbum"),
            "play_url": music_meta.get("playUrl"),
            "cover_medium_url": music_meta.get("coverMediumUrl"),
            "original_cover_medium_url": music_meta.get("originalCoverMediumUrl"),
        },
        "video": {
            "duration": video_meta.get("duration"),
            "width": video_meta.get("width"),
            "height": video_meta.get("height"),
            "format": video_meta.get("format"),
            "definition": video_meta.get("definition"),
            "cover_url": video_meta.get("coverUrl"),
            "original_cover_url": video_meta.get("originalCoverUrl"),
            "subtitle_links": video_meta.get("subtitleLinks", []),
            "transcription_link": video_meta.get("transcriptionLink"),
        },
        "flags": {
            "is_slideshow": item.get("isSlideshow", False),
            "is_pinned": item.get("isPinned", False),
            "is_sponsored": item.get("isSponsored", False),
            "is_ad": item.get("isAd", False),
        },
        "platform": "tiktok",
        "input": item.get("input"),
        "from_profile_section": item.get("fromProfileSection"),
        "comments_dataset_url": item.get("commentsDatasetUrl"),
        "media_urls": item.get("mediaUrls", []),
        "raw": item
    }


def main():
    os.makedirs("archive/derived", exist_ok=True)

    raw_items = load_all_raw()

    normalized = []
    seen_ids = set()

    for item in raw_items:
        if not isinstance(item, dict):
            continue

        item_id = item.get("id")
        if item_id and item_id in seen_ids:
            continue

        normalized.append(normalize_item(item))
        if item_id:
            seen_ids.add(item_id)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(normalized, f, ensure_ascii=False, indent=2)

    print(f"Normalized {len(normalized)} items -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
