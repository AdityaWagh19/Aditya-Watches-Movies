#!/usr/bin/env python3
"""
build_models.py — Run once to preprocess data and build the TF-IDF model.

Usage:
    python scripts/build_models.py
    python scripts/build_models.py --vote-threshold 50

Output:
    models/tfidf_model.pkl      ← fitted TF-IDF vectorizer  (NOT committed to git)
    models/tfidf_matrix.pkl     ← sparse similarity matrix   (NOT committed to git)
    models/model_metadata.json  ← small JSON with build info  (committed)
    data/processed/cleaned_movies.csv ← cleaned dataset       (committed)
"""

import sys, json, joblib, argparse
import pandas as pd
from pathlib import Path

# Allow importing from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.preprocess import (load_raw, apply_filters, parse_all,
                             compute_weighted_score, compute_release_year)
from src.feature_engineering import build_tags, build_tfidf, save_tfidf

# ── Path config ──────────────────────────────────────────────
# The dataset is named TMDB_all_movies.csv in the raw directory.
# The plan references TMDB_movie_dataset_v11.csv — both are handled below.
RAW_CANDIDATES = [
    'data/raw/TMDB_all_movies.csv',
    'data/raw/TMDB_movie_dataset_v11.csv',
    'data/raw/TMDB_all_movies.csv',  # fallback same name
]
PROCESSED = 'data/processed/cleaned_movies.csv'
MODELS    = Path('models')
# ─────────────────────────────────────────────────────────────


def find_raw_path():
    """Find whichever raw CSV exists on disk."""
    for p in RAW_CANDIDATES:
        if Path(p).exists():
            return p
    raise FileNotFoundError(
        "Raw CSV not found. Expected one of:\n" +
        "\n".join(f"  {p}" for p in RAW_CANDIDATES) +
        "\n\nPlace the TMDB CSV at data/raw/TMDB_all_movies.csv and re-run."
    )


def main():
    parser = argparse.ArgumentParser(description='Build TMDB recommendation models')
    parser.add_argument('--vote-threshold', type=int, default=100,
                        help='Minimum vote_count to keep a movie (default: 100)')
    parser.add_argument('--raw', type=str, default=None,
                        help='Path to raw CSV (overrides auto-detection)')
    args = parser.parse_args()

    # Ensure output directories exist
    MODELS.mkdir(exist_ok=True)
    Path('data/processed').mkdir(parents=True, exist_ok=True)

    raw_path = args.raw or find_raw_path()
    print(f"\n{'='*60}")
    print(f"  TMDB Recommendation System — Model Builder")
    print(f"{'='*60}")
    print(f"  Raw data : {raw_path}")
    print(f"  Threshold: vote_count >= {args.vote_threshold}")
    print(f"{'='*60}\n")

    # ── Step 1: Load ─────────────────────────────────────────
    print("[1/5] Loading raw data...")
    df = load_raw(raw_path)

    # ── Step 2: Filter ───────────────────────────────────────
    print("\n[2/5] Filtering...")
    df = apply_filters(df, vote_threshold=args.vote_threshold)

    # ── Step 3: Parse + Score ────────────────────────────────
    print("\n[3/5] Parsing columns and computing scores...")
    df = parse_all(df)
    df = compute_weighted_score(df)
    df = compute_release_year(df)

    # ── Step 4: Feature Engineering ──────────────────────────
    print("\n[4/5] Building tags and TF-IDF model...")
    df = build_tags(df)
    tfidf, matrix = build_tfidf(df)

    # ── Step 5: Save ─────────────────────────────────────────
    print("\n[5/5] Saving artifacts...")
    save_tfidf(tfidf, str(MODELS / 'tfidf_model.pkl'))
    joblib.dump(matrix, str(MODELS / 'tfidf_matrix.pkl'))
    print(f"Saved: models/tfidf_matrix.pkl")

    df.to_csv(PROCESSED, index=False)
    print(f"Saved: {PROCESSED}")

    meta = {
        'n_movies':       int(len(df)),
        'build_date':     pd.Timestamp.now().isoformat(),
        'vote_threshold': args.vote_threshold,
        'tfidf_features': int(matrix.shape[1]),
        'raw_source':     str(raw_path),
    }
    with open(MODELS / 'model_metadata.json', 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Saved: models/model_metadata.json")

    print(f"\n{'='*60}")
    print(f"  [DONE] {len(df):,} movies indexed.")
    print(f"  Next: python scripts/export_recommendations.py --top 5000")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
