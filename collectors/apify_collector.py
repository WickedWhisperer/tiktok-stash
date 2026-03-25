import os
import requests
import time

APIFY_TOKEN = os.getenv("APIFY_TOKEN")
ACTOR_ID = "clockworks~tiktok-scraper"


def run_apify_actor(input_data):
    # 1. Start actor
    start_url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/runs?token={APIFY_TOKEN}"
    response = requests.post(start_url, json=input_data)

    if response.status_code != 201 and response.status_code != 200:
        raise Exception(f"Start failed: {response.text}")

    run_data = response.json()["data"]
    run_id = run_data["id"]

    print(f"Run started: {run_id}")

    # 2. Wait for completion
    status = run_data["status"]

    while status not in ["SUCCEEDED", "FAILED", "ABORTED"]:
        time.sleep(5)

        status_url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={APIFY_TOKEN}"
        status_response = requests.get(status_url)

        status_data = status_response.json()["data"]
        status = status_data["status"]

        print(f"Status: {status}")

    if status != "SUCCEEDED":
        raise Exception(f"Run failed with status: {status}")

    # 3. Fetch dataset
    dataset_id = status_data["defaultDatasetId"]

    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={APIFY_TOKEN}"
    dataset_response = requests.get(dataset_url)

    if dataset_response.status_code != 200:
        raise Exception(f"Dataset fetch failed: {dataset_response.text}")

    return dataset_response.json()
