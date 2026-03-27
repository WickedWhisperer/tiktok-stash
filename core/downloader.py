import subprocess


def download_video(url, output_path, retries=3):
    for attempt in range(retries):
        try:
            result = subprocess.run(
                [
                    "yt-dlp",
                    "--no-playlist",
                    "-f",
                    "mp4",
                    "-o",
                    output_path,
                    url,
                ],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                return True

            print(f"Download failed on attempt {attempt + 1}: {result.stderr.strip()}")

        except Exception as e:
            print(f"Download exception on attempt {attempt + 1}: {e}")

    return False
