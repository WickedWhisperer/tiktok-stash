import os
import json

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/search/search_index.json"

def build_index():
    os.makedirs("archive/search", exist_ok=True)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    index = []

    for item in data:
        hashtags = [h.get("name", "") for h in item.get("hashtags", [])]

        search_text = " ".join([
            (item.get("caption") or ""),
            " ".join(hashtags),
            (item.get("author") or ""),
            (item.get("music", {}).get("title") or ""),
            (item.get("music", {}).get("author") or "")
        ]).lower()

        index.append({
            "id": item.get("id"),
            "author": item.get("author"),
            "author_avatar": item.get("raw", {}).get("authorMeta", {}).get("avatar"),
            "caption": item.get("caption"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),
            "likes": item.get("stats", {}).get("likes"),
            "views": item.get("stats", {}).get("views"),
            "comments": item.get("stats", {}).get("comments"),
            "shares": item.get("stats", {}).get("shares"),
            "favorites": item.get("stats", {}).get("favorites"),
            "hashtags": hashtags,
            "mentions": item.get("mentions", []),
            "music_name": item.get("music", {}).get("title"),
            "music_author": item.get("music", {}).get("author"),
            "search_text": search_text
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Built search index with {len(index)} items")

if __name__ == "__main__":
    build_index()
