import os
import yt_dlp


def sanitize(text):
    """Make safe folder/file names."""
    if not text:
        return "unknown"
    return "".join(c for c in text if c.isalnum() or c in ("_", "-")).strip()


def download_video(url, video_id, author):
    safe_author = sanitize(author)
    folder = f"archive/videos/{safe_author}"

    os.makedirs(folder, exist_ok=True)

    output_path = os.path.join(folder, f"{video_id}.mp4")

    ydl_opts = {
        "outtmpl": output_path,
        "format": "mp4",
        "quiet": True,
        "noplaylist": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    return output_path
