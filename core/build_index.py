import json
import os
from pathlib import Path

INPUT_FILE = Path("archive/normalized_archive.json")
OUTPUT_FILE = Path("archive/search_index.json")


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


def build_index():
    if not INPUT_FILE.exists():
        print("No normalized archive found.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise Exception("normalized_archive.json must contain a list")

    index = []

    for item in data:
        if not isinstance(item, dict):
            continue

        stats = item.get("stats", {}) or {}
        hashtags = extract_text_list(item.get("hashtags"))
        mentions = extract_text_list(item.get("mentions"))
        music = item.get("music", {}) or {}
        raw = item.get("raw", {}) or {}

        author_avatar = item.get("author_avatar") or raw.get("authorMeta", {}).get("avatar") or raw.get("authorMeta", {}).get("originalAvatarUrl")

        music_name = music.get("title")
        music_author = music.get("author")

        index.append({
            "id": item.get("id"),
            "author": item.get("author"),
            "author_avatar": author_avatar,
            "caption": item.get("caption"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            "likes": stats.get("likes", 0),
            "views": stats.get("views", 0),
            "comments": stats.get("comments", 0),
            "shares": stats.get("shares", 0),
            "favorites": stats.get("favorites", 0),

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

    os.makedirs(OUTPUT_FILE.parent, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Search index created: {OUTPUT_FILE} ({len(index)} items)")


if __name__ == "__main__":
    build_index()
