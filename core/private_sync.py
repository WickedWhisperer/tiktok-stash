import os

PRIVATE_FILES = {
    "archive/private/state.json": "private/state.json",
    "archive/private/retry_queue.json": "private/retry_queue.json",
    "archive/private/log.json": "private/log.json",
}


def sync_private_artifacts_from_remote(provider):
    for local_path, remote_rel in PRIVATE_FILES.items():
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        provider.download_file(remote_rel, local_path, retries=1, delay=1)


def sync_private_artifacts_to_remote(provider):
    for local_path, remote_rel in PRIVATE_FILES.items():
        if os.path.exists(local_path):
            provider.upload_file(local_path, remote_rel, retries=2, delay=2)
