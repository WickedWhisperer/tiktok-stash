import os

TRACK_FILE = "archive/meta/downloaded.txt"

def is_downloaded(video_id):
    if not os.path.exists(TRACK_FILE):
        return False

    with open(TRACK_FILE, "r") as f:
        return video_id in f.read()

def mark_downloaded(video_id):
    with open(TRACK_FILE, "a") as f:
        f.write(video_id + "\n")
