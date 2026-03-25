def normalize(item):
    return {
        "id": item.get("id"),
        "author": item.get("authorMeta", {}).get("name"),
        "caption": item.get("text"),
        "created_at": item.get("createTimeISO"),
        "url": item.get("webVideoUrl"),
        "stats": {
            "likes": item.get("diggCount"),
            "shares": item.get("shareCount"),
            "plays": item.get("playCount"),
            "comments": item.get("commentCount"),
            "saves": item.get("collectCount"),
        },
        "music": {
            "name": item.get("musicMeta", {}).get("musicName"),
            "author": item.get("musicMeta", {}).get("musicAuthor"),
            "is_original": item.get("musicMeta", {}).get("musicOriginal"),
        },
        "duration": item.get("videoMeta", {}).get("duration"),
        "platform": "tiktok",
        "raw": item,
    }
