import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Star, Play, Bookmark } from 'lucide-react'
import { usePopularMovies } from '@/hooks/usePopularMovies'
import { buildPosterUrl, buildBackdropUrl } from '@/lib/tmdb'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import MovieGrid from '@/components/MovieGrid'
import FindYourBinge from '@/components/FindYourBinge'
import { cn } from '@/lib/utils'

const ALL_GENRES = ['All', 'Action', 'Drama', 'Comedy', 'Thriller', 'Crime', 'Romance', 'Horror', 'Sci-Fi', 'Animation', 'Documentary', 'Fantasy']

// Stagger variants for hero content children
const heroContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.11, delayChildren: 0.25 },
  },
}
const heroItem = {
  hidden: { opacity: 0, y: 22, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-40">
      <div className="aspect-[2/3] skeleton rounded-xl" />
      <div className="mt-2.5 space-y-1.5">
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

  // Parallax motion values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(useTransform(mouseX, [0, 1], [-12, 12]), { damping: 40, stiffness: 120 })
  const springY = useSpring(useTransform(mouseY, [0, 1], [-8, 8]), { damping: 40, stiffness: 120 })

  const handleMouseMove = useCallback((e) => {
    mouseX.set(e.clientX / window.innerWidth)
    mouseY.set(e.clientY / window.innerHeight)
  }, [mouseX, mouseY])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  const hero = movies[heroIndex] ?? null
  const filtered = useMemo(() => {
    if (activeGenre === 'All') return movies
    return movies.filter(m => m.genres?.toLowerCase().includes(activeGenre.toLowerCase()))
  }, [movies, activeGenre])

  const VISIBLE = 6
  const canPrev = carouselStart > 0
  const canNext = carouselStart + VISIBLE < movies.length

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section
        className="relative h-[72vh] min-h-[520px] overflow-hidden"
      >
        {/* Parallax backdrop */}
        <AnimatePresence mode="wait">
          {hero && (
            <motion.div
              key={hero.id}
              className="absolute inset-[-6%]"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1.04 }}
              exit={{ opacity: 0, scale: 1.0 }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              style={{ x: springX, y: springY }}
            >
              <img
                src={buildBackdropUrl(hero.poster)}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'blur(3px) saturate(0.8)' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-base via-bg-base/80 to-bg-base/10 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-bg-base/50 z-[1]" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,transparent_40%,rgba(10,10,10,0.7)_100%)] z-[1]" />

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
          {hero ? (
            <div className="flex items-center gap-10 w-full">
              {/* Poster with parallax depth */}
              <motion.div
                key={`poster-${hero.id}`}
                className="hidden md:block flex-shrink-0 w-48 xl:w-56"
                initial={{ opacity: 0, x: -40, rotate: -2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.06]">
                  <img
                    src={buildPosterUrl(hero.poster)}
                    alt={hero.title}
                    className="w-full block"
                  />
                </div>
              </motion.div>

              {/* Staggered meta content */}
              <motion.div
                key={`meta-${hero.id}`}
                className="flex-1 max-w-xl"
                variants={heroContainer}
                initial="hidden"
                animate="show"
              >
                {/* Rank + year tag */}
                <motion.div variants={heroItem} className="flex items-center gap-2 mb-3">
                  <span className="section-label">#{heroIndex + 1} Top Rated</span>
                  <span className="w-1 h-1 rounded-full bg-ink-muted/50" />
                  <span className="text-2xs text-ink-muted font-normal tabular-nums">{hero.year}</span>
                </motion.div>

                {/* Title */}
                <motion.h1
                  variants={heroItem}
                  className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.05] mb-4 text-balance tracking-[-0.02em]"
                >
                  {hero.title}
                </motion.h1>

                {/* Rating row */}
                <motion.div variants={heroItem} className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-lime fill-lime" />
                    <span className="text-sm font-semibold text-white tabular-nums">{hero.rating?.toFixed(1)}</span>
                    <span className="text-xs text-ink-muted font-normal">/ 10</span>
                  </div>
                  {hero.director && (
                    <>
                      <span className="text-ink-muted/40 text-xs">·</span>
                      <span className="text-xs text-ink-muted font-normal">{hero.director}</span>
                    </>
                  )}
                </motion.div>

                {/* Genre pills */}
                <motion.div variants={heroItem} className="flex flex-wrap gap-1.5 mb-7">
                  {hero.genreList?.slice(0, 3).map(g => (
                    <span key={g} className="genre-pill">
                      {g}
                    </span>
                  ))}
                </motion.div>

                {/* CTA buttons */}
                <motion.div variants={heroItem} className="flex items-center gap-3">
                  <motion.button
                    onClick={() => navigate(`/Aditya-Watches-Movies/movie/${hero.id}`)}
                    className="flex items-center gap-2 bg-lime text-black text-[13px] font-semibold px-5 py-2.5 rounded-full"
                    whileHover={{ scale: 1.04, brightness: 1.1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 300 }}
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    View Movie
                  </motion.button>

                  <motion.button
                    onClick={() => toggle(hero)}
                    className={cn(
                      'flex items-center gap-2 text-[13px] font-medium px-5 py-2.5 rounded-full border transition-all duration-200',
                      has(hero.id)
                        ? 'bg-lime/10 border-lime/60 text-lime'
                        : 'border-white/[0.12] text-ink-secondary hover:border-white/25 hover:text-ink-primary',
                    )}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Bookmark className={cn('w-3.5 h-3.5', has(hero.id) && 'fill-lime')} />
                    {has(hero.id) ? 'Saved' : 'Watchlist'}
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          ) : (
            /* Hero skeleton */
            <div className="flex items-center gap-10 w-full">
              <div className="hidden md:block w-48 aspect-[2/3] skeleton rounded-2xl" />
              <div className="flex-1 space-y-4 max-w-xl">
                <div className="h-3 skeleton rounded w-32" />
                <div className="h-10 skeleton rounded w-80" />
                <div className="h-4 skeleton rounded w-44" />
                <div className="flex gap-1.5">
                  {[1,2,3].map(i => <div key={i} className="h-5 w-16 skeleton rounded-full" />)}
                </div>
                <div className="flex gap-3 pt-1">
                  <div className="h-10 w-32 skeleton rounded-full" />
                  <div className="h-10 w-28 skeleton rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pager dots */}
        {movies.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {movies.slice(0, 5).map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={cn(
                  'h-[3px] rounded-full transition-all duration-400 ease-out',
                  i === heroIndex ? 'w-7 bg-lime' : 'w-[6px] bg-white/20 hover:bg-white/40',
                )}
                whileTap={{ scale: 0.85 }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Below-fold content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-16">

        {/* ── Find Your Next Binge ── */}
        <FindYourBinge />

        {/* ── Trending Carousel ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="section-label mb-1">Charts</p>
              <h2 className="text-[18px] font-semibold text-ink-primary tracking-[-0.02em]">Trending Now</h2>
            </div>
            <div className="flex gap-1.5">
              {[
                { fn: () => setCarouselStart(s => Math.max(0, s - 3)), can: canPrev, icon: <ChevronLeft className="w-4 h-4" /> },
                { fn: () => setCarouselStart(s => Math.min(movies.length - VISIBLE, s + 3)), can: canNext, icon: <ChevronRight className="w-4 h-4" /> },
              ].map(({ fn, can, icon }, i) => (
                <motion.button
                  key={i}
                  onClick={fn}
                  disabled={!can}
                  className={cn(
                    'w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200',
                    can
                      ? 'border-white/10 text-ink-secondary hover:border-lime/50 hover:text-lime'
                      : 'border-white/[0.04] text-ink-muted/30 cursor-not-allowed',
                  )}
                  whileTap={can ? { scale: 0.88 } : {}}
                >
                  {icon}
                </motion.button>
              ))}
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
                      initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                      transition={{ delay: i * 0.055, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div
                        className="flex-shrink-0 w-40 cursor-pointer group"
                        onClick={() => navigate(`/Aditya-Watches-Movies/movie/${movie.id}`)}
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-bg-elevated ring-1 ring-white/[0.05]">
                          <img
                            src={buildPosterUrl(movie.poster)}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.06]"
                          />
                          {/* Gradient on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          {/* Glow ring on hover */}
                          <div className="absolute inset-0 rounded-xl ring-1 ring-lime/0 group-hover:ring-lime/20 transition-all duration-300" />
                          {/* Rating */}
                          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/5">
                            <Star className="w-2.5 h-2.5 text-lime fill-lime" />
                            <span className="text-2xs font-semibold text-white tabular-nums">{movie.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                        <p className="mt-2.5 text-[13px] font-medium text-ink-primary/90 group-hover:text-white line-clamp-2 leading-snug tracking-[-0.01em] transition-colors duration-200">
                          {movie.title}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5 font-normal tabular-nums">{movie.year}</p>
                      </div>
                    </motion.div>
                  ))
              }
            </AnimatePresence>
          </div>
        </section>

        {/* ── Browse by Genre ── */}
        <section>
          <div className="mb-6">
            <p className="section-label mb-1">Explore</p>
            <h2 className="text-[18px] font-semibold text-ink-primary tracking-[-0.02em]">Browse</h2>
          </div>

          {/* Genre pills */}
          <div className="flex gap-2 flex-wrap mb-8">
            {ALL_GENRES.map(genre => (
              <motion.button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={cn(
                  'px-3.5 py-1 rounded-full text-[12.5px] font-medium border transition-all duration-200',
                  activeGenre === genre
                    ? 'bg-lime text-black border-lime shadow-lime-glow'
                    : 'border-white/[0.08] text-ink-muted hover:border-white/[0.18] hover:text-ink-secondary bg-white/[0.02]',
                )}
                whileTap={{ scale: 0.93 }}
                layout
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
            <MovieGrid movies={filtered} emptyMessage={`No ${activeGenre} movies in the top 50.`} />
          )}
        </section>
      </div>
    </div>
  )
}
