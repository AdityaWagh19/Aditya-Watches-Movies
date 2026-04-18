// TMDB image URL builder
// TMDB posters are stored as relative paths like /abc123.jpg
// Prefix with the CDN base to get a full URL.

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p'

// Fallback placeholder when poster_path is null
export const POSTER_FALLBACK =
  'data:image/svg+xml,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
      <rect width="300" height="450" fill="#1a1a1a"/>
      <rect x="100" y="160" width="100" height="80" rx="8" fill="#2a2a2a"/>
      <circle cx="150" cy="200" r="25" fill="#333"/>
      <text x="150" y="320" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#555">No Poster</text>
    </svg>
  `)

/**
 * Build a full TMDB poster URL.
 * @param {string|null} posterPath - relative path like "/abc123.jpg"
 * @param {'w185'|'w342'|'w500'|'w780'|'original'} size
 * @returns {string} full image URL or fallback SVG
 */
export function buildPosterUrl(posterPath, size = 'w500') {
  if (!posterPath || posterPath === 'nan' || posterPath === 'None') {
    return POSTER_FALLBACK
  }
  return `${TMDB_IMG_BASE}/${size}${posterPath}`
}

/**
 * Build a low-res thumbnail URL (for blurred hero backgrounds).
 */
export function buildBackdropUrl(posterPath) {
  return buildPosterUrl(posterPath, 'w780')
}
