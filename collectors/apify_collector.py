import os
import requests

APIFY_TOKEN = os.getenv("APIFY_TOKEN")

ACTOR_ID = "clockworks/tiktok-scraper"


def run_apify_actor(input_data):
    url = f"https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token={APIFY_TOKEN}"

    response = requests.post(url, json=input_data)

    if response.status_code != 200:
        raise Exception(f"Apify error: {response.text}")

    return response.json()
