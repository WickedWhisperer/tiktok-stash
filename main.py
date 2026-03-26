import json
from collectors.apify_collector import run_apify_actor
from core.save_item import save_items  # IMPORTANT: plural

def main():
    with open("config/settings.json") as f:
        config = json.load(f)

    if config["collector"] == "apify":
        items = run_apify_actor(config["input"])
    else:
        raise Exception("Unsupported collector")

    # Save ALL items in one file (per run)
    save_items(items)

if __name__ == "__main__":
    main()
