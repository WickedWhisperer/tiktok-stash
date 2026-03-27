import subprocess


def build_remote_path(provider, author, video_id):
    return f"{provider}:tiktok-archive/{author}/{video_id}.mp4"


def upload_file(local_path, remote_path):
    try:
        subprocess.run(
            ["rclone", "copy", local_path, remote_path],
            check=True
        )
        return True
    except Exception as e:
        print(f"[UPLOAD ERROR] {e}")
        return False


def generate_public_link(remote_path):
    try:
        result = subprocess.run(
            ["rclone", "link", remote_path],
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except:
        return None
