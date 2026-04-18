"""
test_models.py — Smoke tests for the recommendation pipeline.

Phase 6 of the TMDB Recommendation System.

These tests require that build_models.py has been run first to generate:
  - data/processed/cleaned_movies.csv
  - models/tfidf_matrix.pkl

Run with:
    pytest tests/ -v
"""

import pytest
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
import sys

# Allow importing src modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import get_hybrid_recommendations, get_popular_movies, get_similar_movies


# ── Fixtures ─────────────────────────────────────────────────

@pytest.fixture(scope='module')
def cleaned_df():
    """Load the processed movie DataFrame once per module."""
    csv_path = Path('data/processed/cleaned_movies.csv')
    if not csv_path.exists():
        pytest.skip("cleaned_movies.csv not found — run build_models.py first")
    return pd.read_csv(csv_path)


@pytest.fixture(scope='module')
def tfidf_matrix():
    """Load the precomputed TF-IDF matrix once per module."""
    pkl_path = Path('models/tfidf_matrix.pkl')
    if not pkl_path.exists():
        pytest.skip("tfidf_matrix.pkl not found — run build_models.py first")
    return joblib.load(pkl_path)


# ── Popularity Model Tests ────────────────────────────────────

def test_popular_movies_returns_correct_count(cleaned_df):
    """get_popular_movies should return exactly top_n rows."""
    result = get_popular_movies(cleaned_df, top_n=10)
    assert len(result) == 10, f"Expected 10 rows, got {len(result)}"


def test_popular_movies_has_weighted_score(cleaned_df):
    """Result must contain weighted_score column."""
    result = get_popular_movies(cleaned_df, top_n=5)
    assert 'weighted_score' in result.columns


def test_popular_movies_sorted_descending(cleaned_df):
    """Returned movies must be sorted by weighted_score descending."""
    result = get_popular_movies(cleaned_df, top_n=20)
    scores = result['weighted_score'].tolist()
    assert scores == sorted(scores, reverse=True), "Results are not sorted by weighted_score"


def test_popular_movies_genre_filter(cleaned_df):
    """Genre filter should only return movies containing that genre."""
    result = get_popular_movies(cleaned_df, genre='Action', top_n=10)
    if len(result) > 0:
        for _, row in result.iterrows():
            assert 'action' in str(row.get('genres', '')).lower(), (
                f"Movie '{row['title']}' missing 'action' in genres: {row.get('genres')}"
            )


def test_popular_movies_year_filter(cleaned_df):
    """Year filter should restrict results to the given range."""
    result = get_popular_movies(cleaned_df, year_from=2000, year_to=2010, top_n=10)
    if len(result) > 0 and 'release_year' in result.columns:
        assert result['release_year'].between(2000, 2010).all(), (
            "Some movies fall outside the 2000-2010 year range"
        )


# ── Content Similarity Model Tests ───────────────────────────

def test_similar_movies_excludes_self(cleaned_df, tfidf_matrix):
    """The query movie itself should not appear in its own recommendations."""
    result = get_similar_movies(0, tfidf_matrix, cleaned_df, top_n=10)
    query_id = cleaned_df.iloc[0]['id']
    assert query_id not in result['id'].values, (
        f"Query movie (id={query_id}) appeared in its own recommendations"
    )


def test_similar_movies_count(cleaned_df, tfidf_matrix):
    """Should return exactly top_n results."""
    result = get_similar_movies(0, tfidf_matrix, cleaned_df, top_n=15)
    assert len(result) == 15


def test_similar_movies_has_content_score(cleaned_df, tfidf_matrix):
    """Result must include content_score column with values in [0, 1]."""
    result = get_similar_movies(0, tfidf_matrix, cleaned_df, top_n=5)
    assert 'content_score' in result.columns
    assert result['content_score'].between(-0.01, 1.01).all(), (
        "content_score values outside expected [0, 1] range"
    )


# ── Hybrid Model Tests ────────────────────────────────────────

def test_hybrid_recommendations_count(cleaned_df, tfidf_matrix):
    """Hybrid model should return exactly top_n results."""
    result = get_hybrid_recommendations(0, tfidf_matrix, cleaned_df, top_n=5, pool=20)
    assert len(result) == 5


def test_hybrid_recommendations_has_hybrid_score(cleaned_df, tfidf_matrix):
    """Result must include hybrid_score column."""
    result = get_hybrid_recommendations(0, tfidf_matrix, cleaned_df, top_n=5, pool=20)
    assert 'hybrid_score' in result.columns


def test_hybrid_no_duplicate_ids(cleaned_df, tfidf_matrix):
    """No movie should appear twice in recommendations."""
    result = get_hybrid_recommendations(0, tfidf_matrix, cleaned_df, top_n=10, pool=30)
    assert result['id'].nunique() == len(result), "Duplicate movie IDs in recommendations"


def test_hybrid_excludes_self(cleaned_df, tfidf_matrix):
    """The query movie should not appear among its hybrid recommendations."""
    result = get_hybrid_recommendations(0, tfidf_matrix, cleaned_df, top_n=10, pool=30)
    query_id = cleaned_df.iloc[0]['id']
    assert query_id not in result['id'].values, (
        f"Query movie (id={query_id}) appeared in hybrid recommendations"
    )


def test_hybrid_scores_in_range(cleaned_df, tfidf_matrix):
    """Hybrid scores should be in [0, 1] since they're blended normalized scores."""
    result = get_hybrid_recommendations(0, tfidf_matrix, cleaned_df, top_n=10, pool=30)
    assert result['hybrid_score'].between(-0.01, 1.01).all(), (
        "hybrid_score values outside [0, 1] range"
    )


def test_hybrid_sorted_descending(cleaned_df, tfidf_matrix):
    """Results should be sorted by hybrid_score descending."""
    result = get_hybrid_recommendations(0, tfidf_matrix, cleaned_df, top_n=10, pool=30)
    scores = result['hybrid_score'].tolist()
    assert scores == sorted(scores, reverse=True), "Hybrid results not sorted by hybrid_score"


# ── Preprocessing Sanity Tests ────────────────────────────────

def test_no_null_titles(cleaned_df):
    """No null titles in the processed dataset."""
    assert cleaned_df['title'].notna().all(), "Null titles found in cleaned_movies.csv"


def test_no_null_overviews(cleaned_df):
    """No null overviews in the processed dataset."""
    assert cleaned_df['overview'].notna().all(), "Null overviews found in cleaned_movies.csv"


def test_vote_count_minimum(cleaned_df):
    """All movies should meet the minimum vote_count threshold."""
    # The threshold is stored in model_metadata.json; default safe check is >= 10
    assert (cleaned_df['vote_count'] >= 10).all(), (
        "Some movies have vote_count < 10 — filter may not have applied"
    )


def test_unique_ids(cleaned_df):
    """Movie IDs must be unique."""
    assert cleaned_df['id'].nunique() == len(cleaned_df), "Duplicate movie IDs found"


def test_weighted_score_range(cleaned_df):
    """weighted_score should be in a sensible range [0, 10]."""
    assert cleaned_df['weighted_score'].between(0, 10).all(), (
        "weighted_score out of range [0, 10]"
    )
