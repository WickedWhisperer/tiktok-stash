import json
from pathlib import Path

ARCHIVE_DIR = Path("archive")
OUTPUT_FILE = ARCHIVE_DIR / "search_index.json"


def safe_get(obj, *keys):
    for k in keys:
        if isinstance(obj, dict) and k in obj:
            return obj[k]
    return None


def build_index():
    items = []

    for file in ARCHIVE_DIR.glob("*.json"):
        if file.name == "search_index.json":
            continue

        with open(file, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except:
                continue

        if not isinstance(data, list):
            continue

        for item in data:
            # 🔥 handle Apify structure properly
            author = safe_get(item, "author", "authorMeta", "authorName")
            if isinstance(author, dict):
                author = author.get("name")

            avatar = safe_get(item, "authorAvatar", "author_avatar")
            caption = safe_get(item, "text", "caption", "desc")

            created = safe_get(item, "createTimeISO", "created_at")

            url = safe_get(item, "webVideoUrl", "url")

            stats = item.get("stats", {})

            likes = safe_get(item, "diggCount") or stats.get("diggCount")
            views = safe_get(item, "playCount") or stats.get("playCount")
            comments = safe_get(item, "commentCount") or stats.get("commentCount")
            shares = safe_get(item, "shareCount") or stats.get("shareCount")

            music = item.get("musicMeta", {}) or {}

            hashtags = []
            mentions = []

            if caption:
                for word in caption.split():
                    if word.startswith("#"):
                        hashtags.append(word[1:])
                    if word.startswith("@"):
                        mentions.append(word[1:])

            search_text = " ".join(filter(None, [
                caption,
                " ".join(hashtags),
                author,
                music.get("musicName"),
                music.get("authorName")
            ])).lower()

            items.append({
                "id": item.get("id"),
                "author": author,
                "author_avatar": avatar,
                "caption": caption,
                "created_at": created,
                "url": url,
                "likes": likes or 0,
                "views": views or 0,
                "comments": comments or 0,
                "shares": shares or 0,
                "hashtags": hashtags,
                "mentions": mentions,
                "music_name": music.get("musicName"),
                "music_author": music.get("authorName"),
                "search_text": search_text
            })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    build_index()
