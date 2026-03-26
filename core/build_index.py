import json
import os

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/search/search_index.json"


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


def build_index():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(f"Missing input file: {INPUT_FILE}")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise Exception("normalized_archive.json must contain a list")

    index = []

    for item in data:
        if not isinstance(item, dict):
            continue

        stats = item.get("stats", {}) or {}
        music = item.get("music", {}) or {}
        video = item.get("video", {}) or {}
        raw = item.get("raw", {}) or {}

        hashtags = extract_text_list(item.get("hashtags"))
        mentions = extract_text_list(item.get("mentions"))
        detailed_mentions = item.get("detailed_mentions", [])
        if not isinstance(detailed_mentions, list):
            detailed_mentions = []

        author = item.get("author")
        author_profile = item.get("author_profile") or (
            f"https://www.tiktok.com/@{author}" if author else None
        )

        music_name = music.get("title")
        music_author = music.get("author")
        music_url = music.get("play_url")
        music_id = music.get("id")
        music_cover = music.get("cover_medium_url")
        music_original_cover = music.get("original_cover_medium_url")

        search_text = " ".join([
            str(item.get("caption", "")),
            " ".join(hashtags),
            " ".join(mentions),
            " ".join(
                [
                    str(m.get("username") or m.get("userUniqueId") or "")
                    for m in detailed_mentions
                    if isinstance(m, dict)
                ]
            ),
            str(author or ""),
            str(music_name or ""),
            str(music_author or ""),
        ]).lower()

        index.append({
            "id": item.get("id"),
            "author": author,
            "author_profile": author_profile,
            "author_avatar": item.get("author_avatar"),
            "caption": item.get("caption"),
            "language": item.get("language"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            "likes": stats.get("likes", 0),
            "views": stats.get("views", 0),
            "comments": stats.get("comments", 0),
            "shares": stats.get("shares", 0),
            "favorites": stats.get("favorites", 0),
            "reposts": stats.get("reposts", 0),

            "hashtags": hashtags,
            "mentions": mentions,
            "detailed_mentions": detailed_mentions,

            "music_id": music_id,
            "music_name": music_name,
            "music_author": music_author,
            "music_url": music_url,
            "music_cover": music_cover,
            "music_original_cover": music_original_cover,

            "video_duration": video.get("duration"),
            "video_width": video.get("width"),
            "video_height": video.get("height"),
            "video_format": video.get("format"),
            "video_definition": video.get("definition"),
            "video_cover_url": video.get("cover_url"),
            "video_original_cover_url": video.get("original_cover_url"),
            "video_subtitle_links": video.get("subtitle_links", []),
            "video_transcription_link": video.get("transcription_link"),

            "flags": item.get("flags", {}),
            "input": item.get("input"),
            "from_profile_section": item.get("from_profile_section"),
            "comments_dataset_url": item.get("comments_dataset_url"),
            "media_urls": item.get("media_urls", []),

            "search_text": search_text,
            "raw": raw
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Built search index with {len(index)} items -> {OUTPUT_FILE}")


if __name__ == "__main__":
    build_index()
