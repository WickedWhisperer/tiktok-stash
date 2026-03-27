import subprocess
import os


def upload_to_mega(local_path, remote_path):
    """
    Upload a file or folder to Mega using rclone
    """
    try:
        result = subprocess.run(
            [
                "rclone",
                "copy",
                local_path,
                f"mega:{remote_path}",
                "--create-empty-src-dirs"
            ],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            print("Upload failed:", result.stderr)
            return False

        print(f"Uploaded → {remote_path}")
        return True

    except Exception as e:
        print("Upload error:", str(e))
        return False
