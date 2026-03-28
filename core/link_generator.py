import subprocess


def get_mega_public_link(remote_path):
    try:
        result = subprocess.run(
            ["rclone", "link", f"mega:{remote_path}"],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            return None

        return result.stdout.strip()

    except Exception:
        return None
