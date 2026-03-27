import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from copy import deepcopy
from datetime import datetime

from core.downloader import download_video
from core.retry_queue import add_to_queue, load_queue, remove_from_queue
from core.state_manager import load_state, mark_deleted_missing, save_state, update_video
from core.uploader import build_provider, generate_public_link, upload_file, verify_file

INPUT_FILE = "archive/derived/normalized_archive.json"
OUTPUT_FILE = "archive/derived/enriched_archive.json"
MIN_VALID_BYTES = 10 * 1024


def load_settings():
    default = {
        "storage": {
            "provider": "mega",
            "remote_name": "mega",
            "remote_root": "tiktok-archive",
            "generate_public_links": False,
        },
        "sync": {
            "parallel_workers": 3,
            "upload_retries": 3,
            "upload_retry_delay": 5,
        },
        "download": {
            "retries": 3,
        },
    }

    path = "config/settings.json"
    if not os.path.exists(path):
        return default

    try:
        with open(path, "r", encoding="utf-8") as f:
            loaded = json.load(f)
    except Exception:
        return default

    storage_cfg = loaded.get("storage", {}) if isinstance(loaded, dict) else {}
    sync_cfg = loaded.get("sync", {}) if isinstance(loaded, dict) else {}
    download_cfg = loaded.get("download", {}) if isinstance(loaded, dict) else {}

    return {
        "storage": {
            "provider": storage_cfg.get("provider", default["storage"]["provider"]),
            "remote_name": storage_cfg.get("remote_name") or storage_cfg.get("provider") or default["storage"]["remote_name"],
            "remote_root": storage_cfg.get("remote_root", default["storage"]["remote_root"]),
            "generate_public_links": bool(storage_cfg.get("generate_public_links", default["storage"]["generate_public_links"])),
        },
        "sync": {
            "parallel_workers": int(sync_cfg.get("parallel_workers", default["sync"]["parallel_workers"])),
            "upload_retries": int(sync_cfg.get("upload_retries", default["sync"]["upload_retries"])),
            "upload_retry_delay": int(sync_cfg.get("upload_retry_delay", default["sync"]["upload_retry_delay"])),
        },
        "download": {
            "retries": int(download_cfg.get("retries", default["download"]["retries"])),
        },
    }


def safe_name(value):
    value = str(value or "unknown").strip()
    value = value.replace("/", "_").replace("\\", "_").replace(":", "_")
    return value or "unknown"


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def file_valid(path):
    return os.path.exists(path) and os.path.getsize(path) >= MIN_VALID_BYTES


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_paths(author, video_id):
    safe_author = safe_name(author)
    base_path = os.path.join("archive", "media", safe_author, str(video_id))
    video_path = os.path.join(base_path, "video.mp4")
    metadata_path = os.path.join(base_path, "metadata.json")

    remote_video_rel = f"{safe_author}/{video_id}/video.mp4"
    remote_meta_rel = f"{safe_author}/{video_id}/metadata.json"

    return {
        "safe_author": safe_author,
        "base_path": base_path,
        "video_path": video_path,
        "metadata_path": metadata_path,
        "remote_video_rel": remote_video_rel,
        "remote_meta_rel": remote_meta_rel,
    }


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def build_metadata_payload(item, state_fields):
    payload = deepcopy(item)
    payload["_archive"] = state_fields
    return payload


def process_item(item, state_snapshot, provider, settings, retry_ids):
    video_id = item.get("id")
    if not video_id:
        return None

    author = safe_name(item.get("author") or "unknown")
    paths = build_paths(author, video_id)
    ensure_dir(paths["base_path"])

    state_item = dict(state_snapshot.get(video_id, {}) or {})
    result_item = dict(item)
    now = datetime.utcnow().isoformat()

    download_retries = settings["download"]["retries"]
    upload_retries = settings["sync"]["upload_retries"]
    upload_retry_delay = settings["sync"]["upload_retry_delay"]
    generate_public_links = settings["storage"]["generate_public_links"]

    force_retry = (
        video_id in retry_ids
        or state_item.get("upload_status") in {"failed", "missing_remote", "stale"}
        or state_item.get("verification_status") not in {None, "verified"}
    )

    if state_item.get("upload_status") == "completed" and not force_retry:
        video_ok, video_info, video_error = provider.file_info(paths["remote_video_rel"])
        meta_ok, meta_info, meta_error = provider.file_info(paths["remote_meta_rel"])

        if video_ok and meta_ok:
            public_url = state_item.get("public_link_url")
            public_link_status = state_item.get("public_link_status", "disabled")

            if generate_public_links and not public_url:
                public_url, _ = generate_public_link(provider, paths["remote_video_rel"])
                public_link_status = "created" if public_url else "failed"

            view_url = public_url or state_item.get("video_storage_url") or paths["remote_video_rel"]

            patch = {
                "download_status": "skipped",
                "upload_status": "completed",
                "verification_status": "verified",
                "public_link_status": public_link_status,
                "video_storage_path": paths["remote_video_rel"],
                "metadata_storage_path": paths["remote_meta_rel"],
                "video_storage_url": view_url,
                "public_link_url": public_url,
                "remote_video_size": video_info.get("Size") if isinstance(video_info, dict) else None,
                "remote_metadata_size": meta_info.get("Size") if isinstance(meta_info, dict) else None,
                "is_available": True,
                "last_error": None,
                "last_checked_at": now,
            }

            result_item.update(patch)
            return video_id, result_item, patch, {"action": "remove", "video_id": video_id}

    video_path = paths["video_path"]
    metadata_path = paths["metadata_path"]

    if not file_valid(video_path):
        video_url = item.get("url")
        if not video_url:
            patch = {
                "download_status": "failed",
                "upload_status": "pending",
                "verification_status": "not_verified",
                "is_available": False,
                "last_error": "missing video url",
                "last_checked_at": now,
            }
            result_item.update(patch)
            return video_id, result_item, patch, {"action": "add", "video_id": video_id, "reason": "download_failed", "error": "missing video url"}

        downloaded = download_video(video_url, video_path, retries=download_retries)
        if not downloaded or not file_valid(video_path):
            patch = {
                "download_status": "failed",
                "upload_status": "pending",
                "verification_status": "not_verified",
                "is_available": False,
                "last_error": "download failed",
                "last_checked_at": now,
            }
            result_item.update(patch)
            return video_id, result_item, patch, {"action": "add", "video_id": video_id, "reason": "download_failed", "error": "download failed"}

    local_video_size = os.path.getsize(video_path)
    local_video_checksum = sha256_file(video_path)

    video_uploaded = upload_file(provider, video_path, paths["remote_video_rel"], retries=upload_retries)
    if not video_uploaded:
        patch = {
            "download_status": "completed",
            "upload_status": "failed",
            "verification_status": "not_verified",
            "is_available": True,
            "last_error": "video upload failed",
            "last_checked_at": now,
            "local_video_size": local_video_size,
            "local_video_sha256": local_video_checksum,
        }
        result_item.update(patch)
        return video_id, result_item, patch, {"action": "add", "video_id": video_id, "reason": "upload_failed", "error": "video upload failed"}

    video_verified, video_info, video_error = verify_file(provider, video_path, paths["remote_video_rel"])
    if not video_verified:
        patch = {
            "download_status": "completed",
            "upload_status": "failed",
            "verification_status": "failed",
            "is_available": True,
            "last_error": video_error or "video verification failed",
            "last_checked_at": now,
            "local_video_size": local_video_size,
            "local_video_sha256": local_video_checksum,
        }
        result_item.update(patch)
        return video_id, result_item, patch, {"action": "add", "video_id": video_id, "reason": "verification_failed", "error": video_error or "video verification failed"}

    public_url = None
    public_link_status = "disabled"
    if generate_public_links:
        public_url, _ = generate_public_link(provider, paths["remote_video_rel"])
        public_link_status = "created" if public_url else "failed"

    view_url = public_url or paths["remote_video_rel"]

    metadata_payload = build_metadata_payload(item, {
        "download_status": "completed",
        "upload_status": "completed",
        "verification_status": "completed",
        "public_link_status": public_link_status,
        "video_storage_path": paths["remote_video_rel"],
        "metadata_storage_path": paths["remote_meta_rel"],
        "video_storage_url": view_url,
        "public_link_url": public_url,
        "local_video_size": local_video_size,
        "local_video_sha256": local_video_checksum,
        "remote_video_size": video_info.get("Size") if isinstance(video_info, dict) else local_video_size,
        "remote_metadata_size": None,
        "is_available": True,
        "last_error": None,
        "last_checked_at": now,
    })

    write_json(metadata_path, metadata_payload)

    metadata_uploaded = upload_file(provider, metadata_path, paths["remote_meta_rel"], retries=upload_retries)
    if not metadata_uploaded:
        patch = {
            "download_status": "completed",
            "upload_status": "failed",
            "verification_status": "failed",
            "public_link_status": public_link_status,
            "video_storage_path": paths["remote_video_rel"],
            "metadata_storage_path": paths["remote_meta_rel"],
            "video_storage_url": view_url,
            "public_link_url": public_url,
            "is_available": True,
            "last_error": "metadata upload failed",
            "last_checked_at": now,
            "local_video_size": local_video_size,
            "local_video_sha256": local_video_checksum,
        }
        result_item.update(patch)
        return video_id, result_item, patch, {"action": "add", "video_id": video_id, "reason": "upload_failed", "error": "metadata upload failed"}

    metadata_verified, meta_info, meta_error = verify_file(provider, metadata_path, paths["remote_meta_rel"])
    if not metadata_verified:
        patch = {
            "download_status": "completed",
            "upload_status": "failed",
            "verification_status": "failed",
            "public_link_status": public_link_status,
            "video_storage_path": paths["remote_video_rel"],
            "metadata_storage_path": paths["remote_meta_rel"],
            "video_storage_url": view_url,
            "public_link_url": public_url,
            "is_available": True,
            "last_error": meta_error or "metadata verification failed",
            "last_checked_at": now,
            "local_video_size": local_video_size,
            "local_video_sha256": local_video_checksum,
        }
        result_item.update(patch)
        return video_id, result_item, patch, {"action": "add", "video_id": video_id, "reason": "verification_failed", "error": meta_error or "metadata verification failed"}

    patch = {
        "download_status": "completed",
        "upload_status": "completed",
        "verification_status": "verified",
        "public_link_status": public_link_status,
        "video_storage_path": paths["remote_video_rel"],
        "metadata_storage_path": paths["remote_meta_rel"],
        "video_storage_url": view_url,
        "public_link_url": public_url,
        "remote_video_size": video_info.get("Size") if isinstance(video_info, dict) else local_video_size,
        "remote_metadata_size": meta_info.get("Size") if isinstance(meta_info, dict) else os.path.getsize(metadata_path),
        "is_available": True,
        "last_error": None,
        "last_checked_at": now,
        "local_video_size": local_video_size,
        "local_video_sha256": local_video_checksum,
    }

    result_item.update(patch)

    try:
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(metadata_path):
            os.remove(metadata_path)
    except Exception:
        pass

    return video_id, result_item, patch, {"action": "remove", "video_id": video_id}


def main():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(INPUT_FILE)

    settings = load_settings()
    provider = build_provider(settings["storage"])

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    unique_items = []
    seen_ids = set()

    for item in data:
        if not isinstance(item, dict):
            continue

        video_id = item.get("id")
        if not video_id or video_id in seen_ids:
            continue

        seen_ids.add(video_id)
        unique_items.append(item)

    state = load_state()
    state_snapshot = deepcopy(state)
    queue_entries = load_queue()
    retry_ids = {entry.get("video_id") for entry in queue_entries if entry.get("video_id")}

    enriched_map = {}

    max_workers = max(1, settings["sync"]["parallel_workers"])
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(process_item, item, state_snapshot, provider, settings, retry_ids)
            for item in unique_items
        ]

        for future in as_completed(futures):
            result = future.result()
            if not result:
                continue

            video_id, result_item, state_patch, queue_event = result
            enriched_map[video_id] = result_item

            if state_patch:
                update_video(state, video_id, state_patch)

            if queue_event:
                if queue_event["action"] == "remove":
                    remove_from_queue(video_id)
                elif queue_event["action"] == "add":
                    add_to_queue(video_id, queue_event["reason"], queue_event.get("error"))

    current_ids = {item.get("id") for item in unique_items if item.get("id")}
    mark_deleted_missing(state, current_ids)
    save_state(state)

    enriched = [enriched_map.get(item.get("id"), item) for item in unique_items]

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Processed {len(enriched)} items")


if __name__ == "__main__":
    main()
