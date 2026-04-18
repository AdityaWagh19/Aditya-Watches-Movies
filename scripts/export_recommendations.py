#!/usr/bin/env python3
"""
export_recommendations.py — Precompute all recommendations and write JSON files.

Usage:
    python scripts/export_recommendations.py              # export ALL movies
    python scripts/export_recommendations.py --top 5000   # export top 5000 by weighted_score

Output (served by GitHub Pages — no Python at runtime):
    web/data/movies_index.json              ← all movies (for search autocomplete)
    web/data/popular_movies.json            ← top 50 by weighted score
    web/data/recommendations/{tmdb_id}.json ← one file per movie

IMPORTANT: Run build_models.py first to generate the required artifacts.
"""

import sys, json, ast, argparse, joblib
import pandas as pd
import numpy as np
from pathlib import Path
from tqdm import tqdm

# Allow importing from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import get_hybrid_recommendations, get_popular_movies

# ── Output directories ───────────────────────────────────────
WEB      = Path('web/data')
RECS_DIR = WEB / 'recommendations'
# ─────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description='Export precomputed recommendation JSONs')
    parser.add_argument('--top', type=int, default=None,
                        help='Export only the top N movies by weighted_score. '
                             'Omit for all movies.')
    parser.add_argument('--pool', type=int, default=50,
                        help='Candidate pool size for hybrid model (default: 50)')
    parser.add_argument('--top-n', type=int, default=10,
                        help='Recommendations per movie (default: 10)')
    args = parser.parse_args()

    # ── Setup ────────────────────────────────────────────────
    RECS_DIR.mkdir(parents=True, exist_ok=True)

    # ── Load artifacts ───────────────────────────────────────
    print("Loading model artifacts...")
    if not Path('data/processed/cleaned_movies.csv').exists():
        print("ERROR: data/processed/cleaned_movies.csv not found.")
        print("       Run 'python scripts/build_models.py' first.")
        sys.exit(1)
    if not Path('models/tfidf_matrix.pkl').exists():
        print("ERROR: models/tfidf_matrix.pkl not found.")
        print("       Run 'python scripts/build_models.py' first.")
        sys.exit(1)

    df     = pd.read_csv('data/processed/cleaned_movies.csv')
    matrix = joblib.load('models/tfidf_matrix.pkl')
    print(f"  Loaded {len(df):,} movies, matrix {matrix.shape}")

    # Re-parse list columns (they're saved as string repr in CSV)
    for col in ['genres_list', 'cast_list', 'director_list']:
        if col in df.columns:
            df[col] = df[col].apply(
                lambda x: ast.literal_eval(x) if isinstance(x, str) and x.startswith('[') else []
            )

    # ── Select export subset ─────────────────────────────────
    if args.top:
        export_df = df.nlargest(args.top, 'weighted_score').copy()
        print(f"Exporting top {args.top:,} movies by weighted_score...")
    else:
        export_df = df.copy()
        print(f"Exporting all {len(export_df):,} movies...")

    print(f"\n{'='*60}")
    print(f"  Exporting {len(export_df):,} recommendation files")
    print(f"  Recommendations per movie : {args.top_n}")
    print(f"  Candidate pool size       : {args.pool}")
    print(f"{'='*60}\n")

    # ── 1. movies_index.json (search autocomplete) ───────────
    print("Writing movies_index.json...")
    index = []
    for _, r in df.iterrows():
        entry = {
            'id':     str(r['id']),
            'title':  str(r['title']),
            'year':   int(r.get('release_year', 0)),
            'genres': str(r.get('genres', '')),
            'poster': str(r.get('poster_path', '')) if pd.notna(r.get('poster_path')) else '',
            'rating': round(float(r.get('vote_average', 0)), 1),
        }
        index.append(entry)

    with open(WEB / 'movies_index.json', 'w', encoding='utf-8') as f:
        json.dump(index, f, separators=(',', ':'), ensure_ascii=False)
    print(f"  movies_index.json: {len(index):,} entries")

    # ── 2. popular_movies.json (homepage hero) ───────────────
    print("Writing popular_movies.json...")
    popular = get_popular_movies(df, top_n=50)
    records = popular.to_dict(orient='records')
    with open(WEB / 'popular_movies.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, separators=(',', ':'), default=str)
    print(f"  popular_movies.json: {len(records)} movies")

    # ── 3. Per-movie recommendation JSONs ────────────────────
    print("\nExporting per-movie recommendation files...")
    errors, success = [], 0

    for _, row in tqdm(export_df.iterrows(), total=len(export_df), desc='Exporting'):
        idx      = row.name        # integer position in the full df
        movie_id = str(row['id'])

        try:
            recs = get_hybrid_recommendations(
                idx, matrix, df,
                top_n=args.top_n,
                pool=args.pool
            )

            payload = {
                'query_id':    movie_id,
                'query_title': str(row['title']),
                'recommendations': []
            }

            for _, r in recs.iterrows():
                rec = {
                    'id':           str(r['id']),
                    'title':        str(r['title']),
                    'year':         int(r.get('release_year', 0)),
                    'genres':       str(r.get('genres', '')),
                    'poster':       str(r.get('poster_path', '')) if pd.notna(r.get('poster_path')) else '',
                    'rating':       round(float(r.get('vote_average', 0)), 1),
                    'overview':     str(r.get('overview', ''))[:250],
                    'hybrid_score': float(r.get('hybrid_score', 0)),
                    'director':     str(r.get('director', '')),
                }
                payload['recommendations'].append(rec)

            out_path = RECS_DIR / f"{movie_id}.json"
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(payload, f, separators=(',', ':'), default=str)
            success += 1

        except Exception as e:
            errors.append({
                'id':    movie_id,
                'title': str(row['title']),
                'error': str(e)
            })

    # ── Summary ──────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  [DONE] {success:,} exported | {len(errors)} errors")
    if errors:
        err_path = WEB / 'export_errors.json'
        with open(err_path, 'w') as f:
            json.dump(errors, f, indent=2)
        print(f"  Errors saved to: {err_path}")
    print(f"\n  Next steps:")
    print(f"    git add web/data/")
    print(f"    git commit -m 'data: export recommendations'")
    print(f"    git push")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
