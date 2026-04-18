import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Star, Play, Bookmark } from 'lucide-react'
import { usePopularMovies } from '@/hooks/usePopularMovies'
import { buildPosterUrl, buildBackdropUrl } from '@/lib/tmdb'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import MovieGrid from '@/components/MovieGrid'
import { cn } from '@/lib/utils'

const ALL_GENRES = ['All', 'Action', 'Drama', 'Comedy', 'Thriller', 'Crime', 'Romance', 'Horror', 'Sci-Fi', 'Animation', 'Documentary', 'Fantasy']

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-40">
      <div className="aspect-[2/3] skeleton rounded-xl" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3 skeleton rounded w-3/4" />
        <div className="h-2.5 skeleton rounded w-1/2" />
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { movies, loading } = usePopularMovies()
  const { toggle, has } = useWatchlistStore()

  const [activeGenre, setActiveGenre] = useState('All')
  const [heroIndex, setHeroIndex] = useState(0)
  const [carouselStart, setCarouselStart] = useState(0)

  // Hero movie — cycle through top 5
  const hero = movies[heroIndex] ?? null

  // Filtered grid
  const filtered = useMemo(() => {
    if (activeGenre === 'All') return movies
    return movies.filter(m =>
      m.genres?.toLowerCase().includes(activeGenre.toLowerCase())
    )
  }, [movies, activeGenre])

  // Carousel controls
  const VISIBLE = 6
  const canPrev = carouselStart > 0
  const canNext = carouselStart + VISIBLE < movies.length

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {/* Blurred backdrop */}
        <AnimatePresence mode="wait">
          {hero && (
            <motion.div
              key={hero.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              <img
                src={buildBackdropUrl(hero.poster)}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: 'blur(2px)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-bg-base via-bg-base/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-bg-base/40" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
          {hero ? (
            <div className="flex items-center gap-10 w-full">
              {/* Poster */}
              <motion.div
                key={hero.id}
                className="hidden md:block flex-shrink-0 w-48 xl:w-56"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <img
                  src={buildPosterUrl(hero.poster)}
                  alt={hero.title}
                  className="w-full rounded-2xl shadow-card-hover"
                />
              </motion.div>

              {/* Meta */}
              <motion.div
                key={`meta-${hero.id}`}
                className="flex-1 max-w-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xs font-semibold text-lime uppercase tracking-widest"># {heroIndex + 1} Top Rated</span>
                  <span className="w-1 h-1 rounded-full bg-ink-muted" />
                  <span className="text-2xs text-ink-muted">{hero.year}</span>
                </div>

                <h1 className="font-display text-4xl xl:text-5xl font-bold text-ink-primary leading-tight mb-3 text-balance">
                  {hero.title}
                </h1>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-lime fill-lime" />
                    <span className="text-sm font-semibold text-ink-primary">{hero.rating?.toFixed(1)}</span>
                    <span className="text-xs text-ink-muted">/ 10</span>
                  </div>
                  <span className="text-ink-muted text-xs">·</span>
                  <span className="text-xs text-ink-secondary">{hero.director}</span>
                </div>

                {/* Genre pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {hero.genreList?.slice(0, 3).map(g => (
                    <span key={g} className="text-2xs font-medium px-3 py-1 rounded-full border border-edge-DEFAULT text-ink-secondary">
                      {g}
                    </span>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => navigate(`/Aditya-Watches-Movies/movie/${hero.id}`)}
                    className="flex items-center gap-2 bg-lime text-black text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-lime-400 transition-colors"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Play className="w-4 h-4 fill-black" />
                    View Details
                  </motion.button>

                  <motion.button
                    onClick={() => toggle(hero)}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full border transition-colors',
                      has(hero.id)
                        ? 'bg-lime/10 border-lime text-lime'
                        : 'border-edge-DEFAULT text-ink-secondary hover:border-edge-strong hover:text-ink-primary'
                    )}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Bookmark className={cn('w-4 h-4', has(hero.id) && 'fill-lime')} />
                    {has(hero.id) ? 'Saved' : 'Watchlist'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          ) : (
            // Hero skeleton
            <div className="flex items-center gap-10 w-full">
              <div className="hidden md:block w-48 aspect-[2/3] skeleton rounded-2xl" />
              <div className="flex-1 space-y-4">
                <div className="h-3 skeleton rounded w-32" />
                <div className="h-10 skeleton rounded w-80" />
                <div className="h-4 skeleton rounded w-48" />
                <div className="flex gap-2">
                  {[1,2,3].map(i => <div key={i} className="h-6 w-20 skeleton rounded-full" />)}
                </div>
                <div className="flex gap-3">
                  <div className="h-10 w-32 skeleton rounded-full" />
                  <div className="h-10 w-28 skeleton rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hero pager dots */}
        {movies.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {movies.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === heroIndex ? 'w-6 bg-lime' : 'w-1.5 bg-ink-muted'
                )}
              />
            ))}
          </div>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        {/* ── Trending Carousel ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-ink-primary">Trending Now</h2>
              <p className="text-xs text-ink-muted mt-0.5">Top 50 by IMDb Bayesian score</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCarouselStart(s => Math.max(0, s - 3))}
                disabled={!canPrev}
                className={cn(
                  'w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
                  canPrev
                    ? 'border-edge-DEFAULT text-ink-secondary hover:border-lime hover:text-lime'
                    : 'border-edge-subtle text-ink-muted cursor-not-allowed'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCarouselStart(s => Math.min(movies.length - VISIBLE, s + 3))}
                disabled={!canNext}
                className={cn(
                  'w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
                  canNext
                    ? 'border-edge-DEFAULT text-ink-secondary hover:border-lime hover:text-lime'
                    : 'border-edge-subtle text-ink-muted cursor-not-allowed'
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-4 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : movies.slice(carouselStart, carouselStart + VISIBLE).map((movie, i) => (
                    <motion.div
                      key={movie.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <div
                        className="flex-shrink-0 w-40 cursor-pointer group"
                        onClick={() => navigate(`/Aditya-Watches-Movies/movie/${movie.id}`)}
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-elevated">
                          <img
                            src={buildPosterUrl(movie.poster)}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                            <Star className="w-2.5 h-2.5 text-lime fill-lime" />
                            <span className="text-2xs font-semibold">{movie.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm font-medium text-ink-primary line-clamp-2 font-display leading-tight">
                          {movie.title}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5">{movie.year}</p>
                      </div>
                    </motion.div>
                  ))
              }
            </AnimatePresence>
          </div>
        </section>

        {/* ── Browse by Genre ── */}
        <section>
          <h2 className="text-xl font-display font-bold text-ink-primary mb-6">Browse</h2>

          {/* Genre filter pills */}
          <div className="flex gap-2 flex-wrap mb-8">
            {ALL_GENRES.map(genre => (
              <motion.button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200',
                  activeGenre === genre
                    ? 'bg-lime text-black border-lime'
                    : 'border-edge-DEFAULT text-ink-secondary hover:border-edge-strong hover:text-ink-primary'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {genre}
              </motion.button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <MovieGrid movies={filtered} emptyMessage={`No ${activeGenre} movies in top 50.`} />
          )}
        </section>
      </div>
    </div>
  )
}
