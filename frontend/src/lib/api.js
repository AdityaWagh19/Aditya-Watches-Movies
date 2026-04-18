// All API helpers for the static JSON backend on GitHub Pages
// Data lives at: https://adityawagh19.github.io/Aditya-Watches-Movies/data/

const BASE = 'https://adityawagh19.github.io/Aditya-Watches-Movies'

// In-memory cache — avoids re-fetching the 3MB index on every keystroke
const cache = new Map()

async function fetchCached(url) {
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const data = await res.json()
  cache.set(url, data)
  return data
}

/**
 * Load the full movie index (22,318 entries) for search autocomplete.
 * Cached in memory — only fetched once per session.
 */
export async function getMovieIndex() {
  return fetchCached(`${BASE}/data/movies_index.json`)
}

/**
 * Load the top 50 popular movies by IMDb Bayesian weighted score.
 */
export async function getPopularMovies() {
  return fetchCached(`${BASE}/data/popular_movies.json`)
}

/**
 * Load pre-computed hybrid recommendations for a specific movie.
 * Returns null if the movie has no recommendation file.
 */
export async function getRecommendations(movieId) {
  try {
    return await fetchCached(`${BASE}/data/recommendations/${movieId}.json`)
  } catch {
    return null
  }
}

/**
 * Search movies in the index by title (case-insensitive substring).
 * Optionally filter by genre string.
 * Returns up to `limit` results.
 */
export function searchMovies(index, query, { genre = null, limit = 48 } = {}) {
  if (!query && !genre) return []

  const q = query.toLowerCase().trim()
  const g = genre?.toLowerCase()

  return index
    .filter(m => {
      const matchTitle = !q || m.title.toLowerCase().includes(q)
      const matchGenre = !g || m.genres.toLowerCase().includes(g)
      return matchTitle && matchGenre
    })
    .slice(0, limit)
}
