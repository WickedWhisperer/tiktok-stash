from __future__ import annotations

import argparse

from utils.storage.factory import load_storage_config, get_storage_provider
from utils.file_path_validate import validate_and_set_directory
from utils.storage.migration import migrate_files


def cmd_download():
    config = load_storage_config()
    provider = get_storage_provider(config)
    provider.connect()
    local_dir = validate_and_set_directory(config.local_dir)
    result = provider.download_directory(config.remote_directory, local_dir)
    print(result)


def cmd_upload():
    config = load_storage_config()
    provider = get_storage_provider(config)
    provider.connect()
    local_dir = validate_and_set_directory(config.local_dir)
    result = provider.upload_directory(local_dir, config.remote_directory)
    print(result)


def cmd_migrate():
    config = load_storage_config()
    src = validate_and_set_directory(config.local_dir)
    dst = validate_and_set_directory(config.local_mirror_directory)
    result = migrate_files(src, dst)
    print(result)


def main():
    parser = argparse.ArgumentParser(description="Storage management")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--download", action="store_true")
    group.add_argument("--upload", action="store_true")
    group.add_argument("--migrate", action="store_true")
    args = parser.parse_args()

    if args.download:
        cmd_download()
    elif args.upload:
        cmd_upload()
    elif args.migrate:
        cmd_migrate()


if __name__ == "__main__":
    main()
