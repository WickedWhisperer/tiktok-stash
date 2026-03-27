import yt_dlp
import os
import time


def get_output_path(author, video_id):
    return f"archive/media/{author}/{video_id}.mp4"


def download_video(url, video_id, author="unknown", retries=3):
    output_path = get_output_path(author, video_id)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    ydl_opts = {
        "outtmpl": output_path,
        "format": "mp4",
        "quiet": True,
        "noplaylist": True,
    }

    for attempt in range(retries):
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return output_path

        except Exception as e:
            print(f"[Retry {attempt+1}] Download failed: {e}")
            time.sleep(2)

    print(f"[FAILED] Could not download {video_id}")
    return None
