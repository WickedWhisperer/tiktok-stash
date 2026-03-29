# TikTok Stash

This repository mirrors the Reddit Stash architecture:
one entry script, one config file, one persistent log, a retry queue, storage backends,
and a separate recovery layer.

The main script is `reddit_stash.py` to preserve the original orchestration pattern.
