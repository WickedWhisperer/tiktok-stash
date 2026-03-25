import json
import os

INPUT_FILE = "archive/normalized_archive.json"
OUTPUT_FILE = "archive/search_index.json"


def build_index():
    if not os.path.exists(INPUT_FILE):
        print("No normalized archive found.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    index = []

    for item in data:
        index.append({
            "id": item.get("id"),
            "author": item.get("author"),
            "caption": item.get("caption"),
            "created_at": item.get("created_at"),
            "url": item.get("url"),

            # Flatten stats for easier filtering later
            "likes": item.get("stats", {}).get("likes", 0),
            "views": item.get("stats", {}).get("views", 0),
            "comments": item.get("stats", {}).get("comments", 0),

            # Searchable text blob
            "search_text": " ".join([
                str(item.get("caption", "")),
                " ".join(item.get("hashtags", [])),
                " ".join(item.get("mentions", [])),
                str(item.get("author", ""))
            ]).lower()
        })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Search index created: {OUTPUT_FILE} ({len(index)} items)")


if __name__ == "__main__":
    build_index()
