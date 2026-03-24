from collectors.apify_collector import get_data
from core.normalize import normalize
from core.save_item import save
from core.tracker import is_downloaded, mark_downloaded

import json

with open("config/settings.json") as f:
    config = json.load(f)

data = get_data()

for video in data:
    video = normalize(video)

    if is_downloaded(video["id"]):
        continue

    save(video, config["output_dir"])

    mark_downloaded(video["id"])

print("Done")
