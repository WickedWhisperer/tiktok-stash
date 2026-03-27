import subprocess
import os


def upload_to_mega(local_path, remote_path):
    """
    Upload file using rclone to MEGA
    Returns public link (if configured)
    """

    cmd = [
        "rclone",
        "copy",
        local_path,
        f"mega:{remote_path}",
        "--progress"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"Upload failed: {result.stderr}")

    # Return pseudo path (we'll improve later with share links)
    return f"mega:{remote_path}"
