import subprocess


def download_video(url, output_path):
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "-o",
                output_path,
                "-f",
                "mp4/best",
                url
            ],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            print("yt-dlp error:", result.stderr)
            return False

        return True

    except Exception as e:
        print("Download exception:", str(e))
        return False
