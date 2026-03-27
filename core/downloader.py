import subprocess


def download_video(url, output_path, retries=3):
    for attempt in range(retries):
        try:
            result = subprocess.run(
                [
                    "yt-dlp",
                    "-f", "mp4",
                    "-o", output_path,
                    url
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            if result.returncode == 0:
                return True
            else:
                print(f"Download failed (attempt {attempt+1}): {result.stderr.decode(errors='ignore')}")

        except Exception as e:
            print(f"Exception during download: {e}")

    return False
