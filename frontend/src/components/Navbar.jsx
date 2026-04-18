import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bookmark, X, Film } from 'lucide-react'
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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q') || ''
    if (location.pathname !== '/Aditya-Watches-Movies/search') setQuery('')
    else setQuery(q)
  }, [location])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(() => {
      setSuggestions(searchMovies(index, query, { limit: 6 }))
    }, 180)
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-base/75 backdrop-blur-2xl border-b border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-5">

        {/* ── Logo / Brand ── */}
        <motion.button
          onClick={() => navigate('/Aditya-Watches-Movies/')}
          className="flex items-center gap-2.5 flex-shrink-0 group"
          whileTap={{ scale: 0.96 }}
        >
          {/* Icon mark */}
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 bg-lime rounded-md opacity-100 group-hover:opacity-90 transition-opacity" />
            <Film className="relative w-3.5 h-3.5 text-black" strokeWidth={2.5} />
          </div>
          {/* Wordmark */}
          <span className="hidden sm:block font-sans font-semibold text-[17px] tracking-[-0.03em] text-white">
            Binged
          </span>
        </motion.button>

        {/* ── Search ── */}
        <div className="flex-1 relative max-w-[520px] mx-auto">
          <form onSubmit={handleSearch}>
            <motion.div
              className={cn(
                'flex items-center gap-2.5 px-3.5 h-9 rounded-full border transition-all duration-300',
                focused
                  ? 'bg-bg-elevated border-lime/30 shadow-[0_0_0_3px_rgba(200,255,0,0.08)]'
                  : 'bg-bg-surface border-white/[0.07] hover:border-white/[0.12]',
              )}
              animate={{ width: focused ? '100%' : '100%' }}
            >
              <Search
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0 transition-colors duration-200',
                  focused ? 'text-lime' : 'text-ink-muted',
                )}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search 22,000+ movies…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                className="flex-1 bg-transparent text-[13px] font-medium text-ink-primary placeholder:text-ink-muted/60 placeholder:font-normal outline-none"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    type="button"
                    onClick={clearSearch}
                    className="text-ink-muted hover:text-ink-primary flex-shrink-0"
                    initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </form>

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                className="absolute left-0 right-0 top-11 glass rounded-2xl overflow-hidden z-50 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                {suggestions.map((movie, i) => (
                  <motion.button
                    key={movie.id}
                    onMouseDown={() => handleSuggestionClick(movie)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left group"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <img
                      src={buildPosterUrl(movie.poster, 'w92')}
                      alt={movie.title}
                      className="w-7 h-10 object-cover rounded-md flex-shrink-0 opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink-primary truncate leading-tight">
                        {movie.title}
                      </p>
                      <p className="text-[11px] text-ink-muted mt-0.5 font-normal">
                        {movie.year}{movie.genreList?.[0] ? ` · ${movie.genreList[0]}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-lime flex-shrink-0 tabular-nums">
                      ★ {movie.rating?.toFixed(1)}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Watchlist ── */}
        <motion.button
          onClick={() => navigate('/Aditya-Watches-Movies/watchlist')}
          className="relative flex items-center gap-1.5 flex-shrink-0 text-ink-muted hover:text-ink-primary transition-colors duration-200 group"
          whileTap={{ scale: 0.93 }}
        >
          <Bookmark
            className={cn(
              'w-[18px] h-[18px] transition-colors duration-200',
              count > 0 ? 'text-lime' : 'group-hover:text-ink-primary',
            )}
          />
          <span className="hidden sm:block text-[13px] font-medium">Watchlist</span>
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                className="absolute -top-1.5 -right-1.5 sm:relative sm:top-auto sm:right-auto min-w-[18px] h-[18px] bg-lime text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 280 }}
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </nav>
  )
}
