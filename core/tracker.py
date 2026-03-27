import os

TRACK_FILE = "archive/system/downloaded.txt"


def ensure_file():
    os.makedirs(os.path.dirname(TRACK_FILE), exist_ok=True)
    if not os.path.exists(TRACK_FILE):
        with open(TRACK_FILE, "w"):
            pass


def is_downloaded(video_id):
    ensure_file()

    with open(TRACK_FILE, "r") as f:
        return video_id in f.read()


def mark_downloaded(video_id):
    ensure_file()

    with open(TRACK_FILE, "a") as f:
        f.write(video_id + "\n")
