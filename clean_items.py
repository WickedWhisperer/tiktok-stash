from __future__ import annotations

from utils.env_config import load_settings
from utils.log_utils import load_file_log, save_file_log
from utils.file_path_validate import validate_and_set_directory


def clean():
    cfg = load_settings()
    save_directory = validate_and_set_directory(cfg.get("Settings", "save_directory", fallback="tiktok/"))
    log_data = load_file_log(save_directory)

    removed = 0
    for key, meta in list(log_data.items()):
        file_path = save_directory / meta.get("file_path", "")
        if not file_path.exists():
            log_data.pop(key, None)
            removed += 1

    save_file_log(log_data, save_directory)
    print(f"Cleaned {removed} stale log entries.")


if __name__ == "__main__":
    clean()
