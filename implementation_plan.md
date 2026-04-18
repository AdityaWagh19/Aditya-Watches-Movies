# TMDB Movie Recommendation System — Implementation Plan
### Mini Project | Repo: [AdityaWagh19/Aditya-Watches-Movies](https://github.com/AdityaWagh19/Aditya-Watches-Movies)

---

## What This Is

A **simple, offline recommendation pipeline** that:
1. Reads the TMDB v11 CSV dataset
2. Cleans and filters it down to ~50K usable movies
3. Builds a TF-IDF model on movie "tags"
4. Precomputes recommendations for every movie, saves as JSON
5. Frontend (future) just reads the JSON files

That's it. No server, no real-time ML, no database.

> [!IMPORTANT]
> Everything runs **once on your laptop**. The output is static JSON files pushed to GitHub. GitHub Pages serves them. No Python runs after that.

---

## 3 Strategies

| # | Model | Method | When Used |
|---|---|---|---|
| 1 | **Content-Based** | TF-IDF cosine similarity on weighted tags | "More like this" |
| 2 | **Popularity** | IMDb weighted rating formula | "Top rated / trending" list |
| 3 | **Hybrid** | 70% content + 30% popularity | Final recommendation output |

No FAISS. No SVD. No multi-feature fusion. These are overkill for a precomputed system.

---

## Hardware Reality Check

| Stage | RAM Usage | Why |
|---|---|---|
| Load CSV (16 cols) | ~300 MB | `usecols` skips unused columns |
| After filtering (~50K rows) | ~80 MB | Only vote_count >= 50 movies |
| TF-IDF sparse matrix | ~200 MB | 50K × 10K sparse, not dense |
| `linear_kernel` per movie | peaks ~1 GB | Row-by-row, then discarded |
| **Total peak** | **~1.5 GB** | Comfortably under 8 GB |

Build time: ~10–20 min for 50K movies (mostly the export loop).

---

## Repository Layout

```
Aditya-Watches-Movies/
├── data/
│   ├── raw/
│   │   └── TMDB_movie_dataset_v11.csv    ← download from Kaggle, NOT in git
│   └── processed/
│       └── cleaned_movies.csv            ← committed
│
├── models/                               ← NOT committed (.gitignore)
│   ├── tfidf_model.pkl
│   └── model_metadata.json               ← committed (small)
│
├── src/
│   ├── __init__.py
│   ├── preprocess.py
│   ├── models.py                         ← all 3 models in one file
│   └── utils.py
│
├── notebooks/
│   ├── 01_EDA.ipynb
│   └── 02_Preprocessing.ipynb
│
├── scripts/
│   ├── build_models.py                   ← Phase 5 entry point
│   └── export_recommendations.py         ← Phase 5 JSON export
│
├── web/
│   ├── data/
│   │   ├── movies_index.json             ← all movies (for search)
│   │   ├── popular_movies.json           ← top 50 by weighted score
│   │   └── recommendations/
│   │       └── {tmdb_id}.json            ← one file per movie
│   └── index.html                        ← placeholder
│
├── requirements.txt
└── .gitignore
```

---

## Phase 0: Environment Setup (~30 min)

```bash
# Clone the repo
git clone https://github.com/AdityaWagh19/Aditya-Watches-Movies.git
cd Aditya-Watches-Movies

# Create virtualenv
python -m venv venv
venv\Scripts\activate   # Windows

# Install dependencies
pip install pandas numpy scikit-learn joblib tqdm pytest
```

**`requirements.txt`:**
```
pandas>=2.0
numpy>=1.24
scikit-learn>=1.3
joblib>=1.3
tqdm>=4.65
pytest>=7.4
```

**`.gitignore`:**
```
data/raw/
models/*.pkl
models/*.bin
models/*.npy
web/data/recommendations/
__pycache__/
*.pyc
venv/
.env
```

Download dataset: [TMDB Movie Dataset v11 on Kaggle](https://www.kaggle.com/datasets/asaniczka/tmdb-movies-dataset-2023-930k-movies) → place at `data/raw/TMDB_movie_dataset_v11.csv`

**Git commit:**
```bash
git add requirements.txt .gitignore
git commit -m "init: project structure and dependencies"
git push
```

---

## Phase 1: EDA (~1 hour)

File: `notebooks/01_EDA.ipynb`

**Goal:** Understand the data before touching it. Pick your `vote_count` threshold.

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load just a sample to explore fast
df = pd.read_csv('data/raw/TMDB_movie_dataset_v11.csv',
                 nrows=100_000, low_memory=False)
print(df.shape)
print(df.dtypes)
print(df.isnull().sum())
```

### 6 Key Plots (minimum, add more if you want)

1. **Missing values bar chart** — which columns have NaN and how many
2. **vote_count histogram (log scale)** — shows the long tail, justifies trimming
3. **vote_average histogram** — shows rating distribution
4. **Movies per year line chart** — shows growth over time
5. **Top 15 genres bar chart** — parse `genres` column, count each genre
6. **Runtime histogram** — annotate anything > 300 min as outlier

### Key numbers to record

```python
total = len(df)
print(f"Total rows: {total:,}")
print(f"Released: {(df['status'] == 'Released').sum():,}")
print(f"vote_count >= 10: {(df['vote_count'] >= 10).sum():,}")
print(f"vote_count >= 50: {(df['vote_count'] >= 50).sum():,}")
print(f"vote_count >= 100: {(df['vote_count'] >= 100).sum():,}")
print(f"Has overview: {df['overview'].notna().sum():,}")
print(f"Has poster: {df['poster_path'].notna().sum():,}")
```

These numbers tell you which `vote_count` threshold to use. You want 30K–100K movies.

**Git commit:**
```bash
git add notebooks/01_EDA.ipynb
git commit -m "feat: Phase 1 - EDA notebook"
git push
```

---

## Phase 2: Preprocessing (~1.5 hours)

File: `src/preprocess.py`

### Columns Used vs Dropped

Your dataset has 28 columns. Load only 16:

```python
USECOLS = [
    'id', 'title', 'overview', 'genres', 'cast', 'director',
    'vote_average', 'vote_count', 'popularity', 'release_date',
    'poster_path', 'status', 'imdb_rating', 'runtime',
    'original_language', 'imdb_votes'
]
```

**Dropped (never loaded):** `budget`, `revenue`, `tagline`, `imdb_id`, `original_title`,
`production_companies`, `production_countries`, `spoken_languages`, `writers`,
`producers`, `music_composer`, `director_of_photography`

**Why drop them:** Financial data, redundant IDs, and niche crew roles add noise to
content similarity without improving recommendations.

### Preprocessing Per Column

| Column | Issue | Fix |
|---|---|---|
| `title` | Occasional NaN, whitespace | `dropna` + `str.strip()` |
| `overview` | HTML tags, NaN, very short | `clean_text()` — lowercase, strip HTML, remove non-alpha |
| `genres` | `"Action, Comedy"` flat string | `str.split(',')` → lowercase → join |
| `cast` | `"Tom Hanks, Robin Wright, ..."` | Split → take first 5 → lowercase, remove spaces |
| `director` | `"Christopher Nolan"` | Lowercase, remove spaces → `"christophernolan"` |
| `vote_count` | NaN, 0 | `fillna(0).astype(int)` — main filter lever |
| `vote_average` | NaN, 0 | `fillna(0)` → `clip(0, 10)` |
| `popularity` | NaN, outliers | `fillna(0)` |
| `release_date` | NaN, `"YYYY-MM-DD"` | Parse year → `fillna(1900)` |
| `poster_path` | NaN | Keep NaN — frontend handles gracefully |
| `imdb_rating` | NaN | `fillna(0)` — supplementary only |
| `runtime` | NaN, outliers | `fillna(0)` — display only, not used in ML |
| `original_language` | NaN | `fillna('unknown')` |

### Data Reduction

| `vote_count` threshold | Approx. movies | RAM for TF-IDF |
|---|---|---|
| >= 10 | ~250K | ~5 GB (too much) |
| >= 50 | ~100K | ~2 GB |
| >= 100 | ~60K | ~1.2 GB ✅ recommended |
| >= 200 | ~35K | ~700 MB |

**Use `vote_count >= 100`** for this project. 60K well-rated movies is excellent for a
mini project and fits easily in RAM.

### Full `src/preprocess.py`

```python
import pandas as pd
import numpy as np
import re
from datetime import datetime

CURRENT_YEAR = datetime.now().year

USECOLS = [
    'id', 'title', 'overview', 'genres', 'cast', 'director',
    'vote_average', 'vote_count', 'popularity', 'release_date',
    'poster_path', 'status', 'imdb_rating', 'runtime',
    'original_language', 'imdb_votes'
]


def load_raw(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, usecols=USECOLS, low_memory=False)
    print(f"Loaded: {df.shape}")
    return df


def apply_filters(df: pd.DataFrame, vote_threshold: int = 100) -> pd.DataFrame:
    n = len(df)
    print(f"Start: {n:,} rows")

    df = df.dropna(subset=['title', 'overview'])
    df = df[df['title'].str.strip() != '']
    df = df[df['overview'].str.strip().str.len() > 30]
    print(f"After title/overview filter: {len(df):,}")

    df['vote_count'] = pd.to_numeric(df['vote_count'], errors='coerce').fillna(0).astype(int)
    df = df[df['vote_count'] >= vote_threshold]
    print(f"After vote_count >= {vote_threshold}: {len(df):,}")

    df = df[df['status'] == 'Released']
    print(f"After status=Released: {len(df):,}")

    df = df.drop_duplicates(subset=['id'])
    df = df.reset_index(drop=True)
    print(f"Final: {len(df):,} movies")
    return df


def clean_text(text) -> str:
    if pd.isna(text):
        return ''
    text = str(text).lower()
    text = re.sub(r'<[^>]+>', ' ', text)    # strip HTML
    text = re.sub(r'[^a-z\s]', ' ', text)   # letters only
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def parse_genres(s) -> list:
    if pd.isna(s) or str(s).strip() == '':
        return []
    return [g.strip().lower().replace(' ', '') for g in str(s).split(',') if g.strip()]


def parse_cast(s, limit=5) -> list:
    if pd.isna(s) or str(s).strip() == '':
        return []
    return [a.strip().lower().replace(' ', '') for a in str(s).split(',') if a.strip()][:limit]


def parse_director(s) -> list:
    if pd.isna(s) or str(s).strip() == '':
        return []
    return [d.strip().lower().replace(' ', '') for d in str(s).split(',') if d.strip()]


def compute_weighted_score(df: pd.DataFrame) -> pd.DataFrame:
    """
    IMDb Bayesian weighted rating:
      WR = (v / (v + m)) * R + (m / (v + m)) * C
      v = vote_count, m = min votes threshold (80th percentile), R = vote_average, C = mean rating
    """
    df['vote_average'] = pd.to_numeric(df['vote_average'], errors='coerce').fillna(0).clip(0, 10)
    m = df['vote_count'].quantile(0.80)
    C = df['vote_average'].mean()
    v = df['vote_count']
    R = df['vote_average']
    df['weighted_score'] = (v / (v + m)) * R + (m / (v + m)) * C
    return df


def compute_release_year(df: pd.DataFrame) -> pd.DataFrame:
    df['release_year'] = pd.to_datetime(
        df['release_date'], errors='coerce'
    ).dt.year.fillna(1900).astype(int)
    return df


def parse_all(df: pd.DataFrame) -> pd.DataFrame:
    df['genres_list']    = df['genres'].apply(parse_genres)
    df['cast_list']      = df['cast'].apply(parse_cast)
    df['director_list']  = df['director'].apply(parse_director)
    df['overview_clean'] = df['overview'].apply(clean_text)
    return df
```

**Git commit:**
```bash
git add src/preprocess.py notebooks/02_Preprocessing.ipynb
git commit -m "feat: Phase 2 - preprocessing pipeline"
git push
```

---

## Phase 3: Feature Engineering (~1 hour)

File: `src/feature_engineering.py`

### The Only Thing Here: Weighted Tags + TF-IDF

```
Tags = director × 3  +  genres × 2  +  cast × 1  +  overview × 1
```

Repeating tokens encodes importance without any extra complexity.

```python
# src/feature_engineering.py

from sklearn.feature_extraction.text import TfidfVectorizer
import joblib


def build_tags(df):
    """
    One string per movie encoding all content signals.
    Director repeated 3x → 3x TF-IDF weight.
    """
    def make_tag(r):
        director = ' '.join(r['director_list'] * 3)
        genres   = ' '.join(r['genres_list']   * 2)
        cast     = ' '.join(r['cast_list'])
        overview = r['overview_clean']
        return f"{director} {genres} {cast} {overview}"

    df['tags'] = df.apply(make_tag, axis=1)
    return df


def build_tfidf(df):
    """
    Fit TF-IDF on the tags column.

    max_features=10000 : Top 10K terms. Enough for genre/director/cast vocabulary.
    ngram_range=(1,1)  : Unigrams only — tokens are already compound ('sciencefiction').
    min_df=2           : Ignore terms appearing in only 1 movie (typos, noise).
    sublinear_tf=True  : log(1+tf), dampens excess from repeated director tokens.
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
    joblib.dump(tfidf, path)
    print(f"Saved: {path}")
```

That's the entire feature engineering phase. One vectorizer, one sparse matrix. No fusion, no SVD.

---

## Phase 4: Models (~1.5 hours)

File: `src/models.py`  — **all 3 models in one file**

### Model 1: Content-Based (TF-IDF cosine similarity)

```python
# src/models.py

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import linear_kernel


def get_similar_movies(movie_idx: int, tfidf_matrix, df: pd.DataFrame,
                        top_n: int = 20) -> pd.DataFrame:
    """
    Find top_n movies most similar to movie at movie_idx.

    linear_kernel on L2-normalized TF-IDF vectors = cosine similarity.
    Returns a single row vector of scores, pick the top_n indices.

    This is called ONCE PER MOVIE at build time (export script).
    It is NOT called at query time — results are already in JSON.
    """
    query = tfidf_matrix[movie_idx]                     # sparse row, shape (1, n_features)
    scores = linear_kernel(query, tfidf_matrix).flatten()  # shape (n_movies,)
    scores[movie_idx] = -1                              # exclude self

    top_idx = scores.argsort()[::-1][:top_n]
    result = df.iloc[top_idx][['id', 'title', 'genres', 'vote_average',
                                'release_year', 'poster_path', 'overview',
                                'weighted_score', 'director']].copy()
    result['content_score'] = scores[top_idx].round(4)
    return result
```

### Model 2: Popularity

```python
def get_popular_movies(df: pd.DataFrame, genre: str = None,
                        year_from: int = None, year_to: int = None,
                        top_n: int = 20) -> pd.DataFrame:
    """
    Return top_n movies by IMDb weighted_score.
    Optional genre and year filters.
    """
    out = df.copy()

    if genre and genre.lower() != 'all':
        out = out[out['genres'].str.lower().str.contains(genre.lower(), na=False)]

    if year_from:
        out = out[out['release_year'] >= year_from]
    if year_to:
        out = out[out['release_year'] <= year_to]

    cols = ['id', 'title', 'genres', 'vote_average', 'vote_count',
            'release_year', 'poster_path', 'weighted_score', 'director']
    return out.nlargest(top_n, 'weighted_score')[cols].copy()
```

### Model 3: Hybrid (blend content + popularity)

```python
def get_hybrid_recommendations(movie_idx: int, tfidf_matrix, df: pd.DataFrame,
                                 top_n: int = 10, pool: int = 50) -> pd.DataFrame:
    """
    Hybrid = 70% content similarity + 30% popularity score.

    Steps:
      1. Get top `pool` content-similar candidates
      2. Normalize content_score and weighted_score to [0,1]
      3. Blend: hybrid = 0.70 * content_n + 0.30 * popularity_n
      4. Return top_n by hybrid score

    Why 70/30:
      Content similarity is the primary signal.
      Popularity acts as a quality tiebreaker — two similar movies,
      prefer the one more people have seen and rated highly.
    """
    candidates = get_similar_movies(movie_idx, tfidf_matrix, df, top_n=pool)

    # Normalize to [0, 1]
    def minmax(s):
        mn, mx = s.min(), s.max()
        return (s - mn) / (mx - mn) if mx > mn else s * 0.0

    candidates['content_n']    = minmax(candidates['content_score'])
    candidates['popularity_n'] = minmax(candidates['weighted_score'])
    candidates['hybrid_score'] = (
        0.70 * candidates['content_n'] +
        0.30 * candidates['popularity_n']
    ).round(4)

    return candidates.nlargest(top_n, 'hybrid_score').copy()
```

**Git commit:**
```bash
git add src/feature_engineering.py src/models.py
git commit -m "feat: Phase 3+4 - TF-IDF feature engineering + 3 recommendation models"
git push
```

---

## Phase 5: Build Script + JSON Export (~1.5 hours)

This is the most important phase — it runs the whole pipeline and produces the JSON files.

### `scripts/build_models.py`

```python
#!/usr/bin/env python3
"""
build_models.py — Run once to preprocess data and build the TF-IDF model.

python scripts/build_models.py
"""

import sys, json, joblib
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.preprocess import (load_raw, apply_filters, parse_all,
                             compute_weighted_score, compute_release_year)
from src.feature_engineering import build_tags, build_tfidf, save_tfidf

RAW       = 'data/raw/TMDB_movie_dataset_v11.csv'
PROCESSED = 'data/processed/cleaned_movies.csv'
MODELS    = Path('models')
MODELS.mkdir(exist_ok=True)
Path('data/processed').mkdir(parents=True, exist_ok=True)

# ── Config ──────────────────────────────────────────
VOTE_THRESHOLD = 100   # ~60K movies, safe for 8GB RAM
                       # Try 50 if you want more movies (~100K)
# ────────────────────────────────────────────────────

print("[1/5] Loading raw data...")
df = load_raw(RAW)

print("[2/5] Filtering...")
df = apply_filters(df, vote_threshold=VOTE_THRESHOLD)

print("[3/5] Parsing columns and computing scores...")
df = parse_all(df)
df = compute_weighted_score(df)
df = compute_release_year(df)

print("[4/5] Building tags and TF-IDF model...")
df = build_tags(df)
tfidf, matrix = build_tfidf(df)

print("[5/5] Saving...")
save_tfidf(tfidf, str(MODELS / 'tfidf_model.pkl'))
joblib.dump(matrix, str(MODELS / 'tfidf_matrix.pkl'))
df.to_csv(PROCESSED, index=False)

meta = {
    'n_movies':   int(len(df)),
    'build_date': pd.Timestamp.now().isoformat(),
    'vote_threshold': VOTE_THRESHOLD,
}
with open(MODELS / 'model_metadata.json', 'w') as f:
    json.dump(meta, f, indent=2)

print(f"\n✅ Done. {len(df):,} movies indexed.")
```

### `scripts/export_recommendations.py`

```python
#!/usr/bin/env python3
"""
export_recommendations.py — Precompute recommendations and write JSON files.

Usage:
  python scripts/export_recommendations.py            # export all movies
  python scripts/export_recommendations.py --top 5000 # export top 5000 only

GitHub Pages reads these JSON files directly — no Python needed at runtime.
"""

import sys, json, ast, argparse, joblib
import pandas as pd
import numpy as np
from pathlib import Path
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import get_hybrid_recommendations, get_popular_movies

# Output dirs
WEB      = Path('web/data')
RECS_DIR = WEB / 'recommendations'
RECS_DIR.mkdir(parents=True, exist_ok=True)

# Load artifacts
print("Loading model artifacts...")
df     = pd.read_csv('data/processed/cleaned_movies.csv')
matrix = joblib.load('models/tfidf_matrix.pkl')

# Re-parse list columns (saved as strings in CSV)
for col in ['genres_list', 'cast_list', 'director_list']:
    if col in df.columns:
        df[col] = df[col].apply(
            lambda x: ast.literal_eval(x) if isinstance(x, str) else []
        )

# Arg parsing
parser = argparse.ArgumentParser()
parser.add_argument('--top', type=int, default=None,
                    help='Export only top N movies by weighted_score')
args = parser.parse_args()

export_df = df.nlargest(args.top, 'weighted_score') if args.top else df
print(f"Exporting recommendations for {len(export_df):,} movies...")

# ── 1. movies_index.json (for search autocomplete) ──
index = [
    {
        'id':     str(r['id']),
        'title':  str(r['title']),
        'year':   int(r.get('release_year', 0)),
        'genres': str(r.get('genres', '')),
        'poster': str(r.get('poster_path', '')),
        'rating': round(float(r.get('vote_average', 0)), 1),
    }
    for _, r in df.iterrows()
]
with open(WEB / 'movies_index.json', 'w', encoding='utf-8') as f:
    json.dump(index, f, separators=(',', ':'), ensure_ascii=False)
print(f"  movies_index.json: {len(index):,} entries")

# ── 2. popular_movies.json ───────────────────────────
popular = get_popular_movies(df, top_n=50)
with open(WEB / 'popular_movies.json', 'w', encoding='utf-8') as f:
    json.dump(popular.to_dict(orient='records'), f,
              separators=(',', ':'), default=str)
print("  popular_movies.json: top 50 movies")

# ── 3. Per-movie recommendation JSONs ────────────────
errors, success = [], 0

for _, row in tqdm(export_df.iterrows(), total=len(export_df), desc='Exporting'):
    idx      = row.name           # integer index in df
    movie_id = str(row['id'])

    try:
        recs = get_hybrid_recommendations(idx, matrix, df, top_n=10, pool=50)

        payload = {
            'query_id':    movie_id,
            'query_title': str(row['title']),
            'recommendations': [
                {
                    'id':           str(r['id']),
                    'title':        str(r['title']),
                    'year':         int(r.get('release_year', 0)),
                    'genres':       str(r.get('genres', '')),
                    'poster':       str(r.get('poster_path', '')),
                    'rating':       round(float(r.get('vote_average', 0)), 1),
                    'overview':     str(r.get('overview', ''))[:250],
                    'hybrid_score': float(r.get('hybrid_score', 0)),
                }
                for _, r in recs.iterrows()
            ]
        }

        out_path = RECS_DIR / f"{movie_id}.json"
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, separators=(',', ':'), default=str)
        success += 1

    except Exception as e:
        errors.append({'id': movie_id, 'title': str(row['title']), 'error': str(e)})

print(f"\n✅ Done: {success:,} exported | {len(errors)} errors")
if errors:
    with open(WEB / 'export_errors.json', 'w') as f:
        json.dump(errors, f, indent=2)
    print(f"   Errors saved to web/data/export_errors.json")
```

**Git commit:**
```bash
git add scripts/ data/processed/ models/model_metadata.json web/
git commit -m "feat: Phase 5 - build pipeline and JSON export"
git push
```

---

## Phase 6: Testing (~45 min)

No fancy test suite needed. Just smoke tests that confirm the pipeline works end-to-end.

```python
# tests/test_models.py

import joblib
import pandas as pd
from src.models import get_hybrid_recommendations, get_popular_movies


def test_popular_movies_returns_rows():
    df = pd.read_csv('data/processed/cleaned_movies.csv')
    result = get_popular_movies(df, top_n=10)
    assert len(result) == 10
    assert 'weighted_score' in result.columns


def test_hybrid_recommendations():
    df     = pd.read_csv('data/processed/cleaned_movies.csv')
    matrix = joblib.load('models/tfidf_matrix.pkl')
    result = get_hybrid_recommendations(0, matrix, df, top_n=5, pool=20)
    assert len(result) == 5
    assert 'hybrid_score' in result.columns
    # Self should not appear
    assert df.iloc[0]['id'] not in result['id'].values


def test_no_duplicate_recommendations():
    df     = pd.read_csv('data/processed/cleaned_movies.csv')
    matrix = joblib.load('models/tfidf_matrix.pkl')
    result = get_hybrid_recommendations(0, matrix, df, top_n=10, pool=30)
    assert result['id'].nunique() == len(result)
```

Run tests:
```bash
pytest tests/ -v
```

**Git commit:**
```bash
git add tests/
git commit -m "feat: Phase 6 - smoke tests"
git push
```

---

## Execution Order

```
1. python scripts/build_models.py
   → ~5 min runtime, produces models/ and data/processed/

2. python scripts/export_recommendations.py --top 5000
   → ~10 min for 5K movies, produces web/data/

3. git add web/data/ && git commit -m "data: export recommendations"
   → push JSON to GitHub

4. Enable GitHub Pages: Repo Settings → Pages → Branch main, folder /web
```

> [!TIP]
> Start with `--top 5000` to validate the pipeline quickly. Once it works, run without `--top` to export all movies. This avoids waiting 30 min only to find a bug.

---

## What Each JSON File Looks Like

**`web/data/recommendations/550.json`** (Fight Club):
```json
{
  "query_id": "550",
  "query_title": "Fight Club",
  "recommendations": [
    {
      "id": "680",
      "title": "Pulp Fiction",
      "year": 1994,
      "genres": "Thriller, Crime",
      "poster": "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
      "rating": 8.5,
      "overview": "A burger-loving hit man...",
      "hybrid_score": 0.7823
    }
  ]
}
```

**`web/data/popular_movies.json`** — top 50 by weighted score, used for homepage.

**`web/data/movies_index.json`** — all movies with id/title/year/poster — used for search autocomplete.
