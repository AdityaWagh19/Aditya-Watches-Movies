import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, Bookmark, ArrowLeft, User, Calendar, Tag } from 'lucide-react'
import { useRecommendations } from '@/hooks/useRecommendations'
import { useMovieIndex } from '@/hooks/useMovieIndex'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { buildPosterUrl, buildBackdropUrl } from '@/lib/tmdb'
import { normalizeMovie } from '@/lib/normalize'
import MovieCard from '@/components/MovieCard'
import { cn } from '@/lib/utils'

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        <div className="flex-shrink-0 w-56 mx-auto md:mx-0 aspect-[2/3] skeleton rounded-2xl" />
        <div className="flex-1 space-y-4 pt-4">
          <div className="h-3 skeleton rounded w-28" />
          <div className="h-10 skeleton rounded w-3/4" />
          <div className="h-4 skeleton rounded w-40" />
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-6 w-20 skeleton rounded-full" />)}
          </div>
          <div className="space-y-2 pt-2">
            {[1,2,3,4].map(i => <div key={i} className="h-3 skeleton rounded" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MovieDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { index, loading: indexLoading } = useMovieIndex()
  const { recs, loading: recsLoading } = useRecommendations(id)
  const { toggle, has } = useWatchlistStore()

  const [movie, setMovie] = useState(null)
  const inWatchlist = movie ? has(movie.id) : false

  // Find movie in index
  useEffect(() => {
    if (!indexLoading && index.length) {
      const found = index.find(m => m.id === String(id))
      setMovie(found ? normalizeMovie(found) : null)
    }
  }, [id, index, indexLoading])

  if (indexLoading || (!movie && !indexLoading)) {
    return indexLoading ? <DetailSkeleton /> : (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-ink-primary text-lg font-display">Movie not found</p>
        <button onClick={() => navigate(-1)} className="text-lime text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Backdrop blur */}
      {movie && (
        <div className="fixed inset-0 -z-10 opacity-20">
          <img
            src={buildBackdropUrl(movie.poster)}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'blur(60px)' }}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Back button */}
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary mb-8 transition-colors"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* Movie detail */}
        {movie && (
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Poster */}
            <motion.div
              className="flex-shrink-0 w-56 mx-auto md:mx-0"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img
                src={buildPosterUrl(movie.poster)}
                alt={movie.title}
                className="w-full rounded-2xl shadow-card-hover"
              />
            </motion.div>

            {/* Info */}
            <motion.div
              className="flex-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {/* Genre + year */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xs font-semibold text-lime uppercase tracking-widest">
                  {movie.genreList?.[0]}
                </span>
                <span className="w-1 h-1 rounded-full bg-ink-muted" />
                <span className="text-2xs text-ink-muted">{movie.year}</span>
              </div>

              <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.05] mb-4 text-balance tracking-[-0.025em]">
                {movie.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-6 mb-5">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-lime fill-lime" />
                  <span className="text-2xl font-bold text-ink-primary">{movie.rating?.toFixed(1)}</span>
                  <span className="text-xs text-ink-muted self-end mb-0.5">/ 10</span>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm text-ink-secondary">
                {movie.director && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{movie.director}</span>
                  </div>
                )}
                {movie.year > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                    <span>{movie.year}</span>
                  </div>
                )}
              </div>

              {/* Genre pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genreList?.map(g => (
                  <span key={g} className="text-xs font-medium px-3 py-1 rounded-full border border-edge-DEFAULT text-ink-secondary">
                    <Tag className="w-2.5 h-2.5 inline mr-1 text-ink-muted" />{g}
                  </span>
                ))}
              </div>

              {/* Watchlist button */}
              <motion.button
                onClick={() => toggle(movie)}
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full border transition-all',
                  inWatchlist
                    ? 'bg-lime text-black border-lime'
                    : 'border-edge-DEFAULT text-ink-secondary hover:border-lime hover:text-lime'
                )}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Bookmark className={cn('w-4 h-4', inWatchlist && 'fill-black')} />
                {inWatchlist ? 'Saved to Watchlist' : 'Add to Watchlist'}
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* ── Recommendations ── */}
        <motion.section
          className="mt-16"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="mb-8 pb-5 border-b border-white/[0.05]">
            <p className="section-label mb-1.5">Because you liked this</p>
            <h2 className="text-xl font-semibold text-ink-primary tracking-[-0.02em]">You might also enjoy</h2>
            <p className="text-[12px] text-ink-muted mt-1 font-normal">Ranked by hybrid content + popularity score</p>
          </div>

          {recsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-[2/3] skeleton rounded-xl" />
                  <div className="h-3 skeleton rounded w-3/4" />
                  <div className="h-2.5 skeleton rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : recs.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
              {recs.map((rec, i) => (
                <div key={rec.id} className="space-y-1">
                  <MovieCard movie={rec} index={i} />
                  {/* Hybrid score bar */}
                  <div className="px-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xs text-ink-muted">Match</span>
                      <span className="text-2xs font-semibold text-lime">
                        {Math.round(rec.hybridScore * 100)}%
                      </span>
                    </div>
                    <div className="h-0.5 bg-bg-overlay rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-lime rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${rec.hybridScore * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-muted text-sm py-8 text-center">
              No recommendations available for this movie.
            </p>
          )}
        </motion.section>
      </div>
    </div>
  )
}
