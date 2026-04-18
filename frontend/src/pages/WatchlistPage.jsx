import { motion } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import MovieGrid from '@/components/MovieGrid'
import { normalizeMovieList } from '@/lib/normalize'

export default function WatchlistPage() {
  const navigate = useNavigate()
  const items = useWatchlistStore(s => s.list())
  const movies = normalizeMovieList(items)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs font-medium text-lime uppercase tracking-widest mb-1">Your Collection</p>
        <h1 className="font-display text-3xl font-bold text-ink-primary">Watchlist</h1>
        <p className="text-sm text-ink-muted mt-1">
          {movies.length > 0
            ? `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'} saved`
            : 'Nothing here yet'}
        </p>
      </motion.div>

      {movies.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-32 gap-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-edge-subtle flex items-center justify-center">
            <Bookmark className="w-7 h-7 text-ink-muted" />
          </div>
          <div>
            <p className="text-ink-primary font-medium">Your watchlist is empty</p>
            <p className="text-sm text-ink-muted mt-1">
              Heart any movie card to save it here
            </p>
          </div>
          <button
            onClick={() => navigate('/Aditya-Watches-Movies/')}
            className="mt-2 px-6 py-2 rounded-full bg-lime text-black text-sm font-semibold hover:bg-lime-400 transition-colors"
          >
            Discover Movies
          </button>
        </motion.div>
      ) : (
        <MovieGrid movies={movies} />
      )}
    </div>
  )
}
