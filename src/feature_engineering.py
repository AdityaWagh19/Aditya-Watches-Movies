"""
feature_engineering.py — Weighted tag construction + TF-IDF vectorization.

Phase 3 of the TMDB Recommendation System pipeline.

Tag formula:
    Tags = director × 3  +  genres × 2  +  cast × 1  +  overview
    
Repeating tokens encodes importance without any extra complexity.
Director is repeated 3× because it is the strongest content signal — two
Christopher Nolan films are more similar than two action films in general.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
import joblib


def build_tags(df):
    """
    Build a single weighted-text tag per movie.

    Returns the dataframe with a new 'tags' column.
    """
    def make_tag(r):
        # Repeat each field proportional to its importance weight
        director = ' '.join(r['director_list'] * 3)   # weight ×3
        genres   = ' '.join(r['genres_list']   * 2)   # weight ×2
        cast     = ' '.join(r['cast_list'])            # weight ×1
        overview = r['overview_clean']                 # weight ×1
        return f"{director} {genres} {cast} {overview}"

    df['tags'] = df.apply(make_tag, axis=1)
    print(f"Built tags for {len(df):,} movies")
    return df


def build_tfidf(df):
    """
    Fit a TF-IDF vectorizer on the 'tags' column.

    Hyperparameters:
      max_features=10000 : Top 10K terms. Enough for genre/director/cast vocabulary.
      ngram_range=(1,1)  : Unigrams only — tokens are already compound ('sciencefiction').
      min_df=2           : Ignore terms appearing in only 1 movie (typos, very rare names).
      sublinear_tf=True  : log(1+tf), dampens excess TF weight from repeated director tokens.
      stop_words='english': Remove common English words that add noise.

    Returns:
      tfidf  — fitted TfidfVectorizer
      matrix — sparse matrix of shape (n_movies, max_features)
    """
    tfidf = TfidfVectorizer(
        max_features=10_000,
        ngram_range=(1, 1),
        stop_words='english',
        sublinear_tf=True,
        min_df=2
    )
    matrix = tfidf.fit_transform(df['tags'].fillna(''))
    print(f"TF-IDF matrix: {matrix.shape}  ({matrix.nnz:,} non-zeros)")
    return tfidf, matrix


def save_tfidf(tfidf, path='models/tfidf_model.pkl'):
    """Serialize the fitted vectorizer to disk."""
    joblib.dump(tfidf, path)
    print(f"Saved TF-IDF model: {path}")
