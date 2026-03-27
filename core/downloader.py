import os
import yt_dlp

DOWNLOAD_DIR = "archive/media"


def download_video(url, video_id):
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    output_template = os.path.join(DOWNLOAD_DIR, f"{video_id}.%(ext)s")

    ydl_opts = {
        "outtmpl": output_template,
        "quiet": True,
        "noplaylist": True,
        "format": "mp4/best",
        "merge_output_format": "mp4",
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Find actual downloaded file (extension may vary)
        for file in os.listdir(DOWNLOAD_DIR):
            if file.startswith(video_id):
                return os.path.join(DOWNLOAD_DIR, file)

        return None

    except Exception as e:
        print(f"Download failed for {url}: {e}")
        return None
