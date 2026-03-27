import os
import yt_dlp

DOWNLOAD_DIR = "archive/media"

def download_video(url, video_id):
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    output_path = os.path.join(DOWNLOAD_DIR, f"{video_id}.mp4")

    ydl_opts = {
        "outtmpl": output_path,
        "quiet": True,
        "noplaylist": True,
        "format": "mp4",
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return output_path
    except Exception as e:
        print(f"Download failed for {url}: {e}")
        return None
