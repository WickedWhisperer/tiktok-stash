import json
import os

INPUT_FILE = "archive/normalized_archive.json"
OUTPUT_FILE = "archive/search_index.json"


def extract_text_list(value):
    if value is None:
        return []

    if isinstance(value, str):
        return [value]

    if isinstance(value, dict):
        return [
            str(
                value.get("name")
                or value.get("title")
                or value.get("text")
                or value.get("username")
                or value.get("id")
            )
        ]

    if isinstance(value, list):
        out = []
        for item in value:
            if isinstance(item, dict):
                val = (
                    item.get("name")
                    or item.get("title")
                    or item.get("text")
                    or item.get("username")
                    or item.get("id")
                )
                if val:
                    out.append(str(val))
            elif item:
                out.append(str(item))
        return out

    return []


def build_index():
    if not os.path.exists(INPUT_FILE):
        print("No normalized archive found.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    index = []

    for item in data:
        if not isinstance(item, dict):
            continue

        raw = item.get("raw", {}) or {}

        hashtags = extract_text_list(item.get("hashtags") or raw.get("hashtags"))
        mentions = extract_text_list(item.get("mentions") or raw.get("mentions"))

        stats = item.get("stats", {}) or {}

        likes = stats.get("diggCount", 0)
        views = stats.get("playCount", 0)
        comments = stats.get("commentCount", 0)
        shares = stats.get("shareCount", 0)
        favorites = stats.get("collectCount", 0)

        music = item.get("music") or raw.get("musicMeta") or {}

        music_name = music.get("musicName") or music.get("title") or music.get("name")
        music_author = music.get("musicAuthor") or music.get("author")

        author_meta = raw.get("authorMeta", {}) or {}

        avatar = (
            author_meta.get("avatar")
            or author_meta.get("avatarUrl")
            or author_meta.get("originalAvatarUrl")
        )

        index.append({
            "id": item.get("id"),
            "author": item.get("author"),
            "author_avatar": avatar,
            "caption": item.get("caption"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            "likes": likes,
            "views": views,
            "comments": comments,
            "shares": shares,
            "favorites": favorites,

            "hashtags": hashtags,
            "mentions": mentions,

            "music_name": music_name,
            "music_author": music_author,

            "search_text": " ".join([
                str(item.get("caption", "")),
                " ".join(hashtags),
                " ".join(mentions),
                str(item.get("author", "")),
                str(music_name or ""),
                str(music_author or ""),
            ]).lower()
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Search index created: {OUTPUT_FILE} ({len(index)} items)")


if __name__ == "__main__":
    build_index()
