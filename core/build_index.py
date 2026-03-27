import json
import os

INPUT_FILE = "archive/derived/enriched_archive.json"
OUTPUT_FILE = "archive/search/search_index.json"


def normalize_list(value):
    """Ensure value is always a list of strings."""
    if not value:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if isinstance(value, list):
        out = []
        for v in value:
            if isinstance(v, str):
                if v.strip():
                    out.append(v.strip())
            elif isinstance(v, dict):
                candidate = (
                    v.get("name")
                    or v.get("title")
                    or v.get("text")
                    or v.get("username")
                    or v.get("id")
                )
                if candidate:
                    out.append(str(candidate))
        return out
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


def build_index():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    index = []

    for item in data:
        stats = item.get("stats", {}) or {}
        music = item.get("music", {}) or {}
        video = item.get("video", {}) or {}

        hashtags = normalize_list(item.get("hashtags"))
        mentions = normalize_list(item.get("mentions"))

        detailed_mentions = item.get("detailed_mentions", [])
        if not isinstance(detailed_mentions, list):
            detailed_mentions = []

        author = item.get("author")
        author_profile = item.get("author_profile") or (
            f"https://www.tiktok.com/@{author}" if author else None
        )

        # --- SEARCH TEXT ---
        search_parts = [
            str(item.get("caption", "")),
            " ".join(hashtags),
            " ".join(mentions),
            " ".join(
                str(m.get("username") or m.get("userUniqueId") or "")
                for m in detailed_mentions
                if isinstance(m, dict)
            ),
            str(author or ""),
            str(music.get("title") or ""),
            str(music.get("author") or ""),
        ]
        search_text = " ".join(search_parts).lower()

        index.append({
            # --- CORE ---
            "id": item.get("id"),
            "author": author,
            "author_profile": author_profile,
            "author_avatar": item.get("author_avatar"),
            "caption": item.get("caption"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            # --- STORAGE SYSTEM (IMPORTANT) ---
            "video_storage_url": item.get("video_storage_url"),
            "video_storage_path": item.get("video_storage_path"),  # NEW (structured path)
            "download_status": item.get("download_status", "unknown"),
            "download_error": item.get("download_error"),          # NEW (debugging)
            "uploaded_at": item.get("uploaded_at"),                # NEW (sync tracking)

            # --- STATS ---
            "likes": stats.get("likes", 0),
            "views": stats.get("views", 0),
            "comments": stats.get("comments", 0),
            "shares": stats.get("shares", 0),

            # --- TAGS ---
            "hashtags": hashtags,
            "mentions": mentions,
            "detailed_mentions": detailed_mentions,

            # --- MUSIC ---
            "music_name": music.get("title"),
            "music_author": music.get("author"),
            "music_url": music.get("play_url"),
            "music_cover": music.get("cover_medium_url"),

            # --- VIDEO META ---
            "video_cover_url": video.get("cover_url"),
            "video_duration": video.get("duration"),
            "video_width": video.get("width"),     # NEW
            "video_height": video.get("height"),   # NEW

            # --- EXTRA ---
            "media_urls": item.get("media_urls", []),

            # --- SEARCH ---
            "search_text": search_text
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Built index: {len(index)} items")


if __name__ == "__main__":
    build_index()
