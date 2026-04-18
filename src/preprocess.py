"""
preprocess.py — Data loading, filtering, and feature preparation.

Phase 2 of the TMDB Recommendation System pipeline.
"""

import pandas as pd
import numpy as np
import re
from datetime import datetime

CURRENT_YEAR = datetime.now().year

# Load only these 16 columns from the 28-column CSV
# Drops: budget, revenue, tagline, imdb_id, original_title,
#        production_companies, production_countries, spoken_languages,
#        writers, producers, music_composer, director_of_photography
USECOLS = [
    'id', 'title', 'overview', 'genres', 'cast', 'director',
    'vote_average', 'vote_count', 'popularity', 'release_date',
    'poster_path', 'status', 'imdb_rating', 'runtime',
    'original_language', 'imdb_votes'
]


def load_raw(path: str) -> pd.DataFrame:
    """Load only the required columns from the raw CSV."""
    # Try loading with all expected columns; fall back gracefully if some are missing
    try:
        df = pd.read_csv(path, usecols=USECOLS, low_memory=False)
    except ValueError as e:
        # Some columns may not exist in this version of the dataset
        missing_hint = str(e)
        print(f"[WARNING] Column mismatch: {missing_hint}")
        # Find which columns actually exist
        all_cols = pd.read_csv(path, nrows=0).columns.tolist()
        available = [c for c in USECOLS if c in all_cols]
        print(f"  Loading {len(available)} of {len(USECOLS)} requested columns.")
        df = pd.read_csv(path, usecols=available, low_memory=False)
        # Add missing columns as NaN so downstream code doesn't break
        for col in USECOLS:
            if col not in df.columns:
                df[col] = np.nan
    print(f"Loaded: {df.shape[0]:,} rows × {df.shape[1]} columns")
    return df


def apply_filters(df: pd.DataFrame, vote_threshold: int = 100) -> pd.DataFrame:
    """
    Apply quality filters to reduce the dataset to well-known movies.

    Filters applied (in order):
      1. Drop rows with missing title or overview
      2. Drop overviews shorter than 30 characters (stubs)
      3. Keep only movies with vote_count >= vote_threshold
      4. Keep only status == 'Released'
      5. Drop duplicate IDs
    """
    n = len(df)
    print(f"Start: {n:,} rows")

    df = df.dropna(subset=['title', 'overview'])
    df = df[df['title'].str.strip() != '']
    df = df[df['overview'].str.strip().str.len() > 30]
    print(f"After title/overview filter: {len(df):,}")

    df['vote_count'] = pd.to_numeric(df['vote_count'], errors='coerce').fillna(0).astype(int)
    df = df[df['vote_count'] >= vote_threshold]
    print(f"After vote_count >= {vote_threshold}: {len(df):,}")

    if 'status' in df.columns and df['status'].notna().any():
        df = df[df['status'] == 'Released']
        print(f"After status=Released: {len(df):,}")
    else:
        print("  (status column missing/empty — skipping status filter)")

    df = df.drop_duplicates(subset=['id'])
    df = df.reset_index(drop=True)
    print(f"Final: {len(df):,} movies")
    return df


def clean_text(text) -> str:
    """
    Normalize overview text for TF-IDF:
      - Lowercase
      - Strip HTML tags
      - Remove non-alphabetic characters
      - Collapse whitespace
    """
    if pd.isna(text):
        return ''
    text = str(text).lower()
    text = re.sub(r'<[^>]+>', ' ', text)    # strip HTML
    text = re.sub(r'[^a-z\s]', ' ', text)   # letters only
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def parse_genres(s) -> list:
    """Parse comma-separated genre string to lowercase list."""
    if pd.isna(s) or str(s).strip() == '':
        return []
    return [g.strip().lower().replace(' ', '') for g in str(s).split(',') if g.strip()]


def parse_cast(s, limit=5) -> list:
    """Parse comma-separated cast string; take first `limit` actors (no spaces, lowercase)."""
    if pd.isna(s) or str(s).strip() == '':
        return []
    return [a.strip().lower().replace(' ', '') for a in str(s).split(',') if a.strip()][:limit]


def parse_director(s) -> list:
    """Parse director field (may be a comma-separated list for multi-director films)."""
    if pd.isna(s) or str(s).strip() == '':
        return []
    return [d.strip().lower().replace(' ', '') for d in str(s).split(',') if d.strip()]


def compute_weighted_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    IMDb Bayesian weighted rating formula:
      WR = (v / (v + m)) * R + (m / (v + m)) * C

    Where:
      v = vote_count for the movie
      m = minimum votes required (80th percentile of vote_count)
      R = vote_average for the movie
      C = mean vote_average across all movies

    This penalises movies with very few votes, pushing them toward the mean.
    """
    df['vote_average'] = pd.to_numeric(df['vote_average'], errors='coerce').fillna(0).clip(0, 10)
    m = df['vote_count'].quantile(0.80)
    C = df['vote_average'].mean()
    v = df['vote_count']
    R = df['vote_average']
    df['weighted_score'] = (v / (v + m)) * R + (m / (v + m)) * C
    return df


def compute_release_year(df: pd.DataFrame) -> pd.DataFrame:
    """Extract 4-digit release year from release_date; fill missing with 1900."""
    df['release_year'] = pd.to_datetime(
        df['release_date'], errors='coerce'
    ).dt.year.fillna(1900).astype(int)
    return df


def parse_all(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all column parsers in one pass.
    Adds: genres_list, cast_list, director_list, overview_clean
    """
    df['genres_list']    = df['genres'].apply(parse_genres)
    df['cast_list']      = df['cast'].apply(parse_cast)
    df['director_list']  = df['director'].apply(parse_director)
    df['overview_clean'] = df['overview'].apply(clean_text)
    return df
