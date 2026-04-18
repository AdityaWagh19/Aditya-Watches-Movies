import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bookmark, X, Clapperboard } from 'lucide-react'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { useMovieIndex } from '@/hooks/useMovieIndex'
import { searchMovies } from '@/lib/api'
import { buildPosterUrl } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { index } = useMovieIndex()
  const count = useWatchlistStore(s => s.count())

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Sync input with URL search param
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q') || ''
    if (location.pathname !== '/Aditya-Watches-Movies/search') setQuery('')
    else setQuery(q)
  }, [location])

  // Debounced suggestions
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(() => {
      const results = searchMovies(index, query, { limit: 6 })
      setSuggestions(results)
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [query, index])

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSuggestions([])
    navigate(`/Aditya-Watches-Movies/search?q=${encodeURIComponent(query.trim())}`)
  }

  function handleSuggestionClick(movie) {
    setSuggestions([])
    setQuery('')
    navigate(`/Aditya-Watches-Movies/movie/${movie.id}`)
  }

  function clearSearch() {
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const showDropdown = focused && suggestions.length > 0

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-edge-subtle bg-bg-base/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <button
          onClick={() => navigate('/Aditya-Watches-Movies/')}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
            <Clapperboard className="w-4 h-4 text-black" />
          </div>
          <span className="hidden sm:block font-display font-bold text-lg text-ink-primary">
            Aditya<span className="text-lime">.</span>
          </span>
        </button>

        {/* Search bar */}
        <div className="flex-1 relative max-w-xl mx-auto">
          <form onSubmit={handleSearch}>
            <div className={cn(
              'flex items-center gap-2 px-4 h-10 rounded-full border transition-all duration-300',
              'bg-bg-surface',
              focused
                ? 'border-lime/50 shadow-lime-glow'
                : 'border-edge-DEFAULT'
            )}>
              <Search className="w-4 h-4 text-ink-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search 22,000+ movies..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                className="flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-muted outline-none"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    type="button"
                    onClick={clearSearch}
                    className="text-ink-muted hover:text-ink-primary"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </form>

          {/* Dropdown suggestions */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                className="absolute left-0 right-0 top-12 glass rounded-2xl overflow-hidden z-50 shadow-card-hover"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                {suggestions.map((movie) => (
                  <button
                    key={movie.id}
                    onMouseDown={() => handleSuggestionClick(movie)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <img
                      src={buildPosterUrl(movie.poster, 'w92')}
                      alt={movie.title}
                      className="w-8 h-12 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-primary truncate">{movie.title}</p>
                      <p className="text-xs text-ink-muted">{movie.year} · {movie.genreList?.[0]}</p>
                    </div>
                    <span className="ml-auto text-xs font-semibold text-lime flex-shrink-0">
                      ★ {movie.rating?.toFixed(1)}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Watchlist button */}
        <button
          onClick={() => navigate('/Aditya-Watches-Movies/watchlist')}
          className="relative flex items-center gap-2 flex-shrink-0 text-ink-secondary hover:text-ink-primary transition-colors"
        >
          <Bookmark className="w-5 h-5" />
          <span className="hidden sm:block text-sm font-medium">Watchlist</span>
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                className="absolute -top-1.5 -right-1.5 sm:relative sm:top-auto sm:right-auto w-5 h-5 sm:w-auto sm:h-auto bg-lime text-black text-2xs font-bold rounded-full sm:rounded-md flex items-center justify-center sm:px-1.5 sm:py-0.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </nav>
  )
}
