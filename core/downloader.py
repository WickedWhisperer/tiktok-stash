import yt_dlp


def download_video(url, output_path, retries=3):
    ydl_opts = {
        "outtmpl": output_path,
        "format": "best[ext=mp4]/best",
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "retries": 3,
    }

    for attempt in range(retries):
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            return True
        except Exception as e:
            print(f"Download exception on attempt {attempt + 1}: {e}")

    return False
