import subprocess
import time


def upload_to_mega(local_path, remote_path):
    for attempt in range(3):
        try:
            subprocess.run(
                [
                    "rclone",
                    "copy",
                    local_path,
                    f"mega:{remote_path}",
                    "--create-empty-src-dirs"
                ],
                check=True
            )
            return True
        except Exception as e:
            print(f"Upload attempt {attempt+1} failed: {e}")
            time.sleep(5)

    return False


def generate_public_link(remote_path):
    try:
        result = subprocess.run(
            ["rclone", "link", f"mega:{remote_path}"],
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"Failed to generate link: {e}")
        return None
