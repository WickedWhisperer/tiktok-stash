import json
from collectors.apify_collector import run_apify_actor
from core.save_item import save_item

def main():
    with open("config/settings.json") as f:
        config = json.load(f)

    if config["collector"] == "apify":
        items = run_apify_actor(config["input"])
    else:
        raise Exception("Unsupported collector")

    # Save RAW items only
    for item in items:
        save_item(item)

if __name__ == "__main__":
    main()
