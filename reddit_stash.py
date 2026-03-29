from __future__ import annotations

from utils.config_validator import validate_configuration
from utils.env_config import load_config_and_env, load_settings
from utils.feature_flags import get_feature_summary
from utils.file_path_validate import validate_and_set_directory
from utils.file_operations import save_user_activity, save_gdpr_export
from utils.log_utils import load_file_log, save_file_log


def main():
    print("Validating configuration...")
    try:
        validation_result = validate_configuration()
        for warning in validation_result.get("warnings", []):
            print(f"⚠ {warning}")
        print("✅ Configuration validated successfully")
        print(get_feature_summary())
    except Exception as e:
        print(f"❌ Configuration validation failed: {e}")
        return

    cfg = load_settings()
    _ = load_config_and_env()

    save_directory = validate_and_set_directory(cfg.get("Settings", "save_directory", fallback="tiktok/"))
    check_type = cfg.get("Settings", "check_type", fallback="LOG").upper()
    process_api = cfg.getboolean("Settings", "process_api", fallback=True)
    process_export = cfg.getboolean("Settings", "process_export", fallback=False)
    save_as_json = cfg.get("Settings", "save_type", fallback="ALL").upper() == "JSON"
    download_enabled = cfg.getboolean("Media", "download_enabled", fallback=True)

    log_data = load_file_log(save_directory)

    total_processed = 0
    total_skipped = 0
    total_size = 0

    if process_api:
        print("Processing source items...")
        processed, skipped, size = save_user_activity(
            save_directory,
            log_data,
            check_type=check_type,
            save_as_json=save_as_json,
            download_media_enabled=download_enabled,
        )
        total_processed += processed
        total_skipped += skipped
        total_size += size

    if process_export:
        print("Processing export items...")
        processed, skipped, size = save_gdpr_export(save_directory, log_data)
        total_processed += processed
        total_skipped += skipped
        total_size += size

    save_file_log(log_data, save_directory)

    print(f"\nProcessing completed. {total_processed} items processed, {total_skipped} items skipped.")
    print(f"Total file storage: {total_size / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    main()
