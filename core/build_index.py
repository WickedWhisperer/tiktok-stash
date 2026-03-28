import json
import os

INPUT_FILE = "archive/derived/enriched_archive.json"
if not os.path.exists(INPUT_FILE):
    INPUT_FILE = "archive/derived/normalized_archive.json"

STATE_FILE = "archive/private/state.json"
OUTPUT_FILE = "archive/search/search_index.json"


def normalize_list(value):
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


def load_state():
    if not os.path.exists(STATE_FILE):
        return {}

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {}

    return data if isinstance(data, dict) else {}


def build_index():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    state = load_state()
    index = []

    for item in data:
        stats = item.get("stats", {}) or {}
        music = item.get("music", {}) or {}
        video = item.get("video", {}) or {}
        video_id = item.get("id")
        state_item = state.get(video_id, {}) or {}

        hashtags = normalize_list(item.get("hashtags"))
        mentions = normalize_list(item.get("mentions"))

        detailed_mentions = item.get("detailed_mentions", [])
        if not isinstance(detailed_mentions, list):
            detailed_mentions = []

        author = item.get("author")
        author_profile = item.get("author_profile") or (
            f"https://www.tiktok.com/@{author}" if author else None
        )

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
            "id": video_id,
            "author": author,
            "author_profile": author_profile,
            "author_avatar": item.get("author_avatar"),
            "caption": item.get("caption"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            "video_storage_path": state_item.get("video_storage_path") or item.get("video_storage_path"),
            "metadata_storage_path": state_item.get("metadata_storage_path") or item.get("metadata_storage_path"),
            "video_storage_url": state_item.get("video_storage_url") or item.get("video_storage_url"),
            "public_link_url": state_item.get("public_link_url") or item.get("public_link_url"),
            "download_status": state_item.get("download_status") or item.get("download_status"),
            "upload_status": state_item.get("upload_status") or item.get("upload_status"),
            "verification_status": state_item.get("verification_status") or item.get("verification_status"),
            "public_link_status": state_item.get("public_link_status") or item.get("public_link_status"),
            "is_available": state_item.get("is_available", item.get("is_available", True)),
            "last_error": state_item.get("last_error") or item.get("last_error"),

            "local_video_size": state_item.get("local_video_size") or item.get("local_video_size"),
            "local_video_sha256": state_item.get("local_video_sha256") or item.get("local_video_sha256"),
            "local_metadata_size": state_item.get("local_metadata_size") or item.get("local_metadata_size"),
            "local_metadata_sha256": state_item.get("local_metadata_sha256") or item.get("local_metadata_sha256"),
            "remote_video_size": state_item.get("remote_video_size") or item.get("remote_video_size"),
            "remote_metadata_size": state_item.get("remote_metadata_size") or item.get("remote_metadata_size"),

            "likes": stats.get("likes", 0),
            "views": stats.get("views", 0),
            "comments": stats.get("comments", 0),
            "shares": stats.get("shares", 0),
            "favorites": stats.get("favorites", stats.get("collectCount", 0)),
            "reposts": stats.get("reposts", stats.get("repostCount", 0)),

            "hashtags": hashtags,
            "mentions": mentions,
            "detailed_mentions": detailed_mentions,

            "music_name": music.get("title"),
            "music_author": music.get("author"),
            "music_url": music.get("play_url"),
            "music_cover": music.get("cover_medium_url"),

            "video_cover_url": video.get("cover_url"),
            "video_duration": video.get("duration"),

            "media_urls": item.get("media_urls", []),

            "search_text": search_text
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Built index: {len(index)} items")


if __name__ == "__main__":
    build_index()
