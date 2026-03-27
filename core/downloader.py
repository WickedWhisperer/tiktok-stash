import subprocess


def download_video(url, output_path):
    subprocess.run(
        [
            "yt-dlp",
            "-o",
            output_path,
            "-f",
            "mp4",
            url
        ],
        check=True
    )
