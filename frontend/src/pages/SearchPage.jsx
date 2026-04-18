import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMovieIndex } from '@/hooks/useMovieIndex'
import { searchMovies } from '@/lib/api'
import MovieGrid from '@/components/MovieGrid'
import { Loader2 } from 'lucide-react'

const GENRES = ['All', 'Action', 'Drama', 'Comedy', 'Thriller', 'Crime', 'Romance', 'Horror', 'Sci-Fi', 'Animation', 'Fantasy']

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { index, loading: indexLoading } = useMovieIndex()

  const [activeGenre, setActiveGenre] = useState('All')

  // Reset genre filter when query changes
  useEffect(() => { setActiveGenre('All') }, [query])

  const results = useMemo(() => {
    if (!index.length) return []
    return searchMovies(
      index,
      query,
      {
        genre: activeGenre === 'All' ? null : activeGenre,
        limit: 96,
      }
    )
  }, [index, query, activeGenre])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {query ? (
          <>
            <p className="text-xs font-medium text-lime uppercase tracking-widest mb-1">Search Results</p>
            <h1 className="font-display text-3xl font-bold text-ink-primary">
              "{query}"
            </h1>
            {!indexLoading && (
              <p className="text-sm text-ink-muted mt-1">
                {results.length.toLocaleString()} {results.length === 1 ? 'match' : 'matches'} found
              </p>
            )}
          </>
        ) : (
          <h1 className="font-display text-3xl font-bold text-ink-primary">All Movies</h1>
        )}
      </motion.div>

      {/* Genre filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        {GENRES.map(genre => (
          <motion.button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium border transition-all',
              activeGenre === genre
                ? 'bg-lime text-black border-lime'
                : 'border-edge-DEFAULT text-ink-secondary hover:border-edge-strong hover:text-ink-primary',
            ].join(' ')}
            whileTap={{ scale: 0.95 }}
          >
            {genre}
          </motion.button>
        ))}
      </div>

      {/* Loading state */}
      {indexLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 text-lime animate-spin" />
          <p className="text-sm text-ink-muted">Loading movie index...</p>
        </div>
      ) : (
        <MovieGrid
          movies={results}
          emptyMessage={
            query
              ? `No movies match "${query}". Try a different title.`
              : 'Start typing to search 22,000+ movies.'
          }
        />
      )}
    </div>
  )
}
