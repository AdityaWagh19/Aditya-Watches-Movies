import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react'
import { useMovieIndex } from '@/hooks/useMovieIndex'
import { normalizeMovieList } from '@/lib/normalize'
import MovieCard from '@/components/MovieCard'
import { cn } from '@/lib/utils'

// ── Config ────────────────────────────────────────────────
const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'Western',
]

const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '7.5+', value: 7.5 },
  { label: '8+', value: 8 },
]

const DECADE_OPTIONS = [
  { label: 'Any Era', min: 0, max: 9999 },
  { label: '2020s', min: 2020, max: 9999 },
  { label: '2010s', min: 2010, max: 2019 },
  { label: '2000s', min: 2000, max: 2009 },
  { label: '90s', min: 1990, max: 1999 },
  { label: 'Classic', min: 0, max: 1989 },
]

// ── Variants ──────────────────────────────────────────────
const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const resultsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
}

const resultItem = {
  hidden: { opacity: 0, x: 20, filter: 'blur(4px)' },
  show: {
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
}

// ── Skeleton card ─────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────
export default function FindYourBinge() {
  const { index, loading: indexLoading } = useMovieIndex()

  const [selectedGenres, setSelectedGenres] = useState([])
  const [minRating, setMinRating] = useState(0)
  const [decade, setDecade]       = useState(DECADE_OPTIONS[0])
  const [results, setResults]     = useState(null)   // null = not yet run
  const [isLoading, setIsLoading] = useState(false)
  const [hasRun, setHasRun]       = useState(false)
  const rowRef = useRef(null)

  const hasFilters = selectedGenres.length > 0 || minRating > 0 || decade.min > 0

  // Toggle a genre chip
  function toggleGenre(g) {
    setSelectedGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  // Clear everything
  function resetAll() {
    setSelectedGenres([])
    setMinRating(0)
    setDecade(DECADE_OPTIONS[0])
    setResults(null)
    setHasRun(false)
  }

  // Run the filter
  const runBinge = useCallback(() => {
    if (indexLoading || !index.length) return
    setIsLoading(true)
    setHasRun(true)

    // Small async yield so the loading state renders before heavy filter
    setTimeout(() => {
      let pool = index

      // Genre filter — must match ALL selected genres
      if (selectedGenres.length > 0) {
        pool = pool.filter(m =>
          selectedGenres.every(g =>
            m.genres?.toLowerCase().includes(g.toLowerCase())
          )
        )
        // Fallback: match ANY genre if no results
        if (pool.length === 0) {
          pool = index.filter(m =>
            selectedGenres.some(g =>
              m.genres?.toLowerCase().includes(g.toLowerCase())
            )
          )
        }
      }

      // Rating filter
      if (minRating > 0) {
        pool = pool.filter(m => m.rating >= minRating)
      }

      // Decade filter
      if (decade.min > 0 || decade.max < 9999) {
        pool = pool.filter(m => m.year >= decade.min && m.year <= decade.max)
      }

      // Sort by rating desc, take top 20
      const sorted = normalizeMovieList(
        [...pool]
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 20)
      )

      setResults(sorted)
      setIsLoading(false)

      // Smooth scroll row back to start
      if (rowRef.current) rowRef.current.scrollLeft = 0
    }, 50)
  }, [index, indexLoading, selectedGenres, minRating, decade])

  // Carousel scroll helpers
  function scrollRow(dir) {
    if (!rowRef.current) return
    rowRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className="relative"
    >
      {/* Section header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="section-label mb-1.5">Discover</p>
          <h2 className="text-[22px] font-semibold text-ink-primary tracking-[-0.025em] leading-tight">
            Find Your Next Binge
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-1 font-normal">
            Pick a mood and we'll find movies you'll love.
          </p>
        </div>

        {/* Reset pill — only when filters active */}
        <AnimatePresence>
          {hasFilters && (
            <motion.button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted hover:text-ink-primary border border-white/[0.08] hover:border-white/[0.18] px-3 py-1.5 rounded-full transition-all duration-200"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              whileTap={{ scale: 0.92 }}
            >
              <RotateCcw className="w-3 h-3" />
              Clear All
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Filter card ── */}
      <div className="glass rounded-2xl p-5 md:p-7 space-y-6">

        {/* Genre chips */}
        <div>
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-3">
            Genres <span className="text-ink-muted/40 normal-case tracking-normal font-normal ml-1">(pick any)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(g => {
              const active = selectedGenres.includes(g)
              return (
                <motion.button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={cn(
                    'px-3.5 py-1 rounded-full text-[12.5px] font-medium border transition-all duration-200',
                    active
                      ? 'bg-lime text-black border-lime shadow-lime-glow'
                      : 'border-white/[0.08] text-ink-muted hover:border-white/[0.2] hover:text-ink-secondary bg-white/[0.02]',
                  )}
                  whileTap={{ scale: 0.91 }}
                  layout
                >
                  {active && (
                    <motion.span
                      className="inline-block mr-1 text-[10px]"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 300 }}
                    >
                      ✓
                    </motion.span>
                  )}
                  {g}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* ── Row 2: Rating + Decade ── */}
        <div className="flex flex-col sm:flex-row gap-5">

          {/* Min Rating */}
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-3">
              Min Rating
            </p>
            <div className="flex gap-2 flex-wrap">
              {RATING_OPTIONS.map(opt => {
                const active = minRating === opt.value
                return (
                  <motion.button
                    key={opt.label}
                    onClick={() => setMinRating(opt.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[12px] font-medium border transition-all duration-200',
                      active
                        ? 'bg-lime text-black border-lime'
                        : 'border-white/[0.08] text-ink-muted hover:border-white/[0.2] hover:text-ink-secondary bg-white/[0.02]',
                    )}
                    whileTap={{ scale: 0.9 }}
                  >
                    {opt.label}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Era / Decade */}
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.12em] mb-3">
              Era
            </p>
            <div className="flex gap-2 flex-wrap">
              {DECADE_OPTIONS.map(opt => {
                const active = decade.label === opt.label
                return (
                  <motion.button
                    key={opt.label}
                    onClick={() => setDecade(opt)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[12px] font-medium border transition-all duration-200',
                      active
                        ? 'bg-lime text-black border-lime'
                        : 'border-white/[0.08] text-ink-muted hover:border-white/[0.2] hover:text-ink-secondary bg-white/[0.02]',
                    )}
                    whileTap={{ scale: 0.9 }}
                  >
                    {opt.label}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex items-center gap-4 pt-1">
          <motion.button
            onClick={runBinge}
            disabled={indexLoading}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-full text-[13.5px] font-semibold transition-all duration-200',
              indexLoading
                ? 'bg-lime/40 text-black/50 cursor-not-allowed'
                : 'bg-lime text-black hover:bg-lime/90 shadow-lime-glow',
            )}
            whileHover={!indexLoading ? { scale: 1.04, boxShadow: '0 0 28px rgba(200,255,0,0.45)' } : {}}
            whileTap={!indexLoading ? { scale: 0.96 } : {}}
            transition={{ type: 'spring', damping: 16, stiffness: 300 }}
          >
            <Sparkles className="w-4 h-4" />
            {indexLoading ? 'Loading index…' : 'Binge Now'}
          </motion.button>

          {/* Active filter summary */}
          <AnimatePresence>
            {(selectedGenres.length > 0 || minRating > 0 || decade.min > 0) && (
              <motion.p
                className="text-[12px] text-ink-muted font-normal"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
              >
                {[
                  selectedGenres.length > 0 && selectedGenres.join(', '),
                  minRating > 0 && `${minRating}+ rating`,
                  decade.min > 0 && decade.label,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Results ── */}
      <AnimatePresence mode="wait">
        {hasRun && (
          <motion.div
            key="results"
            className="mt-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Results header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                {isLoading ? (
                  <div className="h-4 skeleton rounded w-40" />
                ) : (
                  <motion.p
                    className="text-[13px] font-medium text-ink-secondary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {results?.length > 0
                      ? <><span className="text-lime font-semibold">{results.length}</span> picks matched your taste</>
                      : <span className="text-ink-muted">No exact matches — try adjusting filters</span>
                    }
                  </motion.p>
                )}
              </div>

              {/* Carousel arrows */}
              {!isLoading && results?.length > 0 && (
                <div className="flex gap-1.5">
                  {[
                    { fn: () => scrollRow(-1), icon: <ChevronLeft className="w-4 h-4" /> },
                    { fn: () => scrollRow(1),  icon: <ChevronRight className="w-4 h-4" /> },
                  ].map(({ fn, icon }, i) => (
                    <motion.button
                      key={i}
                      onClick={fn}
                      className="w-8 h-8 rounded-full border border-white/10 text-ink-secondary hover:border-lime/50 hover:text-lime flex items-center justify-center transition-all duration-200"
                      whileTap={{ scale: 0.88 }}
                    >
                      {icon}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Card row */}
            <div
              ref={rowRef}
              className="flex gap-4 overflow-x-auto pb-3 no-scrollbar"
            >
              {isLoading ? (
                // Skeleton loading row
                Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              ) : results?.length > 0 ? (
                <motion.div
                  className="flex gap-4"
                  variants={resultsContainer}
                  initial="hidden"
                  animate="show"
                >
                  {results.map((movie, i) => (
                    <motion.div key={movie.id} variants={resultItem} className="flex-shrink-0">
                      <MovieCard movie={movie} index={i} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
