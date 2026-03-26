import os
import json

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/search/search_index.json"

def extract_mentions(text):
    if not text:
        return []
    words = text.split()
    return [w[1:] for w in words if w.startswith("@")]

def build_index():
    os.makedirs("archive/search", exist_ok=True)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    index = []

    for item in data:
        hashtags = [h.get("name", "") for h in item.get("hashtags", [])]

        caption = item.get("caption") or ""

        mentions = extract_mentions(caption)

        author = item.get("author")
        author_profile = f"https://www.tiktok.com/@{author}" if author else None

        music_title = item.get("music", {}).get("title")
        music_author = item.get("music", {}).get("author")

        # Try to get playable music URL if exists
        music_url = item.get("raw", {}).get("musicMeta", {}).get("playUrl")

        search_text = " ".join([
            caption,
            " ".join(hashtags),
            " ".join(mentions),
            author or "",
            music_title or "",
            music_author or ""
        ]).lower()

        index.append({
            "id": item.get("id"),
            "author": author,
            "author_avatar": item.get("raw", {}).get("authorMeta", {}).get("avatar"),
            "author_profile": author_profile,

            "caption": caption,
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            "likes": item.get("stats", {}).get("likes"),
            "views": item.get("stats", {}).get("views"),
            "comments": item.get("stats", {}).get("comments"),
            "shares": item.get("stats", {}).get("shares"),
            "favorites": item.get("stats", {}).get("favorites"),

            "hashtags": hashtags,
            "mentions": mentions,

            "music_name": music_title,
            "music_author": music_author,
            "music_url": music_url,

            "search_text": search_text
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Built search index with {len(index)} items")

if __name__ == "__main__":
    build_index()
