import subprocess


def download_video(url, output_path):
    try:
        command = [
            "yt-dlp",
            "-o", output_path,
            "-f", "mp4",
            url
        ]

        result = subprocess.run(command, capture_output=True)

        return result.returncode == 0

    except Exception:
        return False
