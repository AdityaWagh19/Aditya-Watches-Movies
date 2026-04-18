"""
models.py — Three recommendation models in one file.

Phase 4 of the TMDB Recommendation System pipeline.

Models:
  1. Content-Based  : TF-IDF cosine similarity
  2. Popularity     : IMDb Bayesian weighted_score with optional filters
  3. Hybrid         : 70% content + 30% popularity
"""

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import linear_kernel


# ──────────────────────────────────────────────────────────────
# Model 1: Content-Based (TF-IDF cosine similarity)
# ──────────────────────────────────────────────────────────────

def get_similar_movies(movie_idx: int, tfidf_matrix, df: pd.DataFrame,
                        top_n: int = 20) -> pd.DataFrame:
    """
    Find top_n movies most similar to the movie at movie_idx.

    linear_kernel on L2-normalized TF-IDF vectors is equivalent to cosine
    similarity but ~2× faster because it avoids the normalization step
    (TfidfVectorizer already returns L2-normalized rows).

    This function is called ONCE PER MOVIE at build time (export script).
    It is NOT called at query time — results are precomputed into JSON.

    Args:
        movie_idx   : Integer row index in df / tfidf_matrix.
        tfidf_matrix: Sparse matrix (n_movies, n_features).
        df          : DataFrame with movie metadata.
        top_n       : Number of similar movies to return.

    Returns:
        DataFrame of top_n similar movies with content_score column.
    """
    query  = tfidf_matrix[movie_idx]                        # sparse row (1, n_features)
    scores = linear_kernel(query, tfidf_matrix).flatten()   # dense (n_movies,)
    scores[movie_idx] = -1                                   # exclude the query movie itself

    top_idx = scores.argsort()[::-1][:top_n]

    # Pull the required output columns
    output_cols = ['id', 'title', 'genres', 'vote_average',
                   'release_year', 'poster_path', 'overview',
                   'weighted_score', 'director']
    # Only select columns that actually exist in df
    existing_cols = [c for c in output_cols if c in df.columns]

    result = df.iloc[top_idx][existing_cols].copy()
    result['content_score'] = scores[top_idx].round(4)
    return result


# ──────────────────────────────────────────────────────────────
# Model 2: Popularity (IMDb weighted score, filterable)
# ──────────────────────────────────────────────────────────────

def get_popular_movies(df: pd.DataFrame, genre: str = None,
                        year_from: int = None, year_to: int = None,
                        top_n: int = 20) -> pd.DataFrame:
    """
    Return the top_n movies ranked by IMDb Bayesian weighted_score.

    Optional filters:
      genre     : Filter to movies containing this genre string (case-insensitive).
      year_from : Include only movies released on/after this year.
      year_to   : Include only movies released on/before this year.

    Args:
        df        : Processed DataFrame with weighted_score column.
        genre     : Genre string to filter by, or None / 'all' for no filter.
        year_from : Minimum release year (inclusive), or None.
        year_to   : Maximum release year (inclusive), or None.
        top_n     : Number of movies to return.

    Returns:
        DataFrame of top_n popular movies.
    """
    out = df.copy()

    if genre and genre.lower() != 'all':
        out = out[out['genres'].str.lower().str.contains(genre.lower(), na=False)]

    if year_from and 'release_year' in out.columns:
        out = out[out['release_year'] >= year_from]
    if year_to and 'release_year' in out.columns:
        out = out[out['release_year'] <= year_to]

    cols = ['id', 'title', 'genres', 'vote_average', 'vote_count',
            'release_year', 'poster_path', 'weighted_score', 'director']
    existing_cols = [c for c in cols if c in out.columns]

    return out.nlargest(top_n, 'weighted_score')[existing_cols].copy()


# ──────────────────────────────────────────────────────────────
# Model 3: Hybrid (70% content + 30% popularity)
# ──────────────────────────────────────────────────────────────

def get_hybrid_recommendations(movie_idx: int, tfidf_matrix, df: pd.DataFrame,
                                 top_n: int = 10, pool: int = 50) -> pd.DataFrame:
    """
    Hybrid recommendation blending content similarity and popularity.

    Algorithm:
      1. Get the top `pool` content-similar candidates via TF-IDF cosine similarity.
      2. Min-max normalize both content_score and weighted_score to [0, 1].
      3. Compute hybrid_score = 0.70 × content_n + 0.30 × popularity_n
      4. Return the top_n movies by hybrid_score.

    Rationale for 70/30 split:
      Content similarity is the primary signal (the user clicked on a specific movie).
      Popularity is a quality tiebreaker — between two equally similar movies,
      prefer the one more people have seen and rated highly.

    Args:
        movie_idx   : Integer row index in df / tfidf_matrix.
        tfidf_matrix: Sparse matrix (n_movies, n_features).
        df          : DataFrame with movie metadata and weighted_score.
        top_n       : Final number of recommendations to return.
        pool        : Candidate pool size (content-similar movies to score before blending).

    Returns:
        DataFrame of top_n hybrid-scored recommendations.
    """
    candidates = get_similar_movies(movie_idx, tfidf_matrix, df, top_n=pool)

    def minmax(s: pd.Series) -> pd.Series:
        """Normalize a series to [0, 1]; return zeros if constant."""
        mn, mx = s.min(), s.max()
        return (s - mn) / (mx - mn) if mx > mn else s * 0.0

    candidates['content_n']    = minmax(candidates['content_score'])
    candidates['popularity_n'] = minmax(candidates['weighted_score'])
    candidates['hybrid_score'] = (
        0.70 * candidates['content_n'] +
        0.30 * candidates['popularity_n']
    ).round(4)

    return candidates.nlargest(top_n, 'hybrid_score').copy()
