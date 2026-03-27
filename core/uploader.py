from core.storage import get_storage_provider


def build_provider(storage_config=None):
    return get_storage_provider(storage_config)


def upload_file(provider, local_path, remote_relative_path, retries=3):
    return provider.upload_file(local_path, remote_relative_path, retries=retries)


def verify_file(provider, local_path, remote_relative_path):
    return provider.verify_file(local_path, remote_relative_path)


def generate_public_link(provider, remote_relative_path):
    link, _ = provider.public_link(remote_relative_path)
    return link
