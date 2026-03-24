import json
import os

def save(video, base_dir):
    user = video.get("author", "unknown")
    video_id = video.get("id")

    folder = os.path.join(base_dir, user, "videos")
    os.makedirs(folder, exist_ok=True)

    path = os.path.join(folder, f"{video_id}.json")

    with open(path, "w") as f:
        json.dump(video, f, indent=4)

    return path
