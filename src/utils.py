"""
utils.py — Shared helper utilities.
"""

import json
from pathlib import Path


def ensure_dirs(*paths):
    """Create directories if they don't exist."""
    for p in paths:
        Path(p).mkdir(parents=True, exist_ok=True)


def safe_float(val, default=0.0) -> float:
    """Convert value to float; return default on failure."""
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def safe_int(val, default=0) -> int:
    """Convert value to int; return default on failure."""
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def write_json(data, path, compact=True):
    """Write data to a JSON file. compact=True uses minimal separators."""
    separators = (',', ':') if compact else (', ', ': ')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=separators, ensure_ascii=False, default=str)
