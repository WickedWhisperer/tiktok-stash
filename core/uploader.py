import subprocess
import time


def upload_file(local_path, remote_path, retries=3):
    for attempt in range(retries):
        result = subprocess.run(
            ["rclone", "copy", local_path, remote_path],
            capture_output=True
        )

        if result.returncode == 0:
            return True

        time.sleep(2)

    return False


def file_exists(remote_path):
    result = subprocess.run(
        ["rclone", "lsf", remote_path],
        capture_output=True
    )

    return result.returncode == 0 and result.stdout.strip() != ""
