import json
import os

INPUT_FILE = "archive/normalized_archive.json"
OUTPUT_FILE = "archive/search_index.json"


def extract_hashtags(hashtags):
    if not isinstance(hashtags, list):
        return []
    result = []
    for tag in hashtags:
        if isinstance(tag, dict):
            result.append(tag.get("name", ""))
        elif isinstance(tag, str):
            result.append(tag)
    return result


def extract_mentions(mentions):
    if not isinstance(mentions, list):
        return []
    result = []
    for m in mentions:
        if isinstance(m, dict):
            result.append(m.get("name", ""))
        elif isinstance(m, str):
            result.append(m)
    return result


def build_index():
    if not os.path.exists(INPUT_FILE):
        print("No normalized archive found.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    index = []

    for item in data:
        hashtags = extract_hashtags(item.get("hashtags", []))
        mentions = extract_mentions(item.get("mentions", []))

        index.append({
            "id": item.get("id"),
            "author": item.get("author"),
            "caption": item.get("caption"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            "likes": item.get("stats", {}).get("likes", 0),
            "views": item.get("stats", {}).get("views", 0),
            "comments": item.get("stats", {}).get("comments", 0),

            "search_text": " ".join([
                str(item.get("caption", "")),
                " ".join(hashtags),
                " ".join(mentions),
                str(item.get("author", ""))
            ]).lower()
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Search index created: {OUTPUT_FILE} ({len(index)} items)")


if __name__ == "__main__":
    build_index()
