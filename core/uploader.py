import subprocess
import time

def upload_to_mega(local_path, remote_path):
    for attempt in range(3):
        try:
            subprocess.run(
                [
                    "rclone",
                    "copyto",
                    local_path,
                    f"mega:{remote_path}",
                ],
                check=True,
            )
            return True
        except Exception as e:
            print(f"Upload attempt {attempt + 1} failed: {e}")
            time.sleep(5)
    return False
