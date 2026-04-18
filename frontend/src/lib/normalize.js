/**
 * normalize.js — Unify field names across the 3 JSON data sources.
 *
 * Problem: The 3 JSON files use inconsistent field names:
 *   movies_index.json   → { id, title, year, genres, poster, rating }
 *   popular_movies.json → { id, title, release_year, genres, poster_path, vote_average, ... }
 *   recommendations/*.json → { id, title, year, genres, poster, rating, overview, director }
 *
 * Solution: normalize every movie object to a single canonical shape.
 */

/**
 * Canonical movie shape:
 * {
 *   id: string,
 *   title: string,
 *   year: number,
 *   genres: string,           // "Action, Drama"
 *   genreList: string[],      // ["Action", "Drama"]
 *   poster: string,           // TMDB relative path e.g. "/abc.jpg"
 *   rating: number,           // 0-10
 *   overview?: string,
 *   director?: string,
 *   voteCount?: number,
 *   weightedScore?: number,
 *   hybridScore?: number,
 * }
 */

export function normalizeMovie(raw) {
  return {
    id:           String(raw.id ?? ''),
    title:        raw.title ?? 'Unknown',
    year:         Number(raw.year ?? raw.release_year ?? 0),
    genres:       raw.genres ?? '',
    genreList:    parseGenres(raw.genres),
    poster:       raw.poster ?? raw.poster_path ?? null,
    rating:       Number(raw.rating ?? raw.vote_average ?? 0),
    overview:     raw.overview ?? null,
    director:     raw.director ?? null,
    voteCount:    Number(raw.vote_count ?? 0),
    weightedScore: Number(raw.weighted_score ?? 0),
    hybridScore:  Number(raw.hybrid_score ?? 0),
  }
}

export function normalizeMovieList(list) {
  return (list ?? []).map(normalizeMovie)
}

function parseGenres(genres) {
  if (!genres) return []
  return genres.split(',').map(g => g.trim()).filter(Boolean)
}
