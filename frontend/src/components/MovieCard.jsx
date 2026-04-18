import { useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import { buildPosterUrl } from '@/lib/tmdb'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { cn } from '@/lib/utils'

// Spring config for the 3D tilt
const SPRING = { damping: 18, stiffness: 280 }

export default function MovieCard({ movie, index = 0, size = 'md' }) {
  const navigate = useNavigate()
  const cardRef = useRef(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { has, toggle } = useWatchlistStore()
  const inWatchlist = has(movie.id)

  // 3D tilt motion values
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), SPRING)
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), SPRING)
  const glowOpacity = useSpring(0, { damping: 20, stiffness: 200 })

  const sizeClasses = {
    sm: 'w-32 md:w-36',
    md: 'w-40 md:w-44',
    lg: 'w-48 md:w-56',
  }

  function handleMouseMove(e) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
    glowOpacity.set(1)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
    glowOpacity.set(0)
    setHovered(false)
  }

  function handleClick() {
    navigate(`/Aditya-Watches-Movies/movie/${movie.id}`)
  }

  function handleWatchlist(e) {
    e.stopPropagation()
    toggle(movie)
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn('relative flex-shrink-0 cursor-pointer', sizeClasses[size])}
      style={{ perspective: 800, rotateX, rotateY }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileHover={{ y: -5, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
    >
      {/* Poster container */}
      <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-bg-elevated ring-1 ring-white/5">
        {/* Skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 skeleton rounded-xl" />
        )}

        <img
          src={buildPosterUrl(movie.poster)}
          alt={movie.title}
          onLoad={() => setImgLoaded(true)}
          className={cn(
            'w-full h-full object-cover transition-all duration-500 ease-out',
            imgLoaded ? 'opacity-100' : 'opacity-0',
            hovered && 'scale-[1.06]',
          )}
        />

        {/* Gradient overlay — deepens on hover for readability */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
            opacity: hovered ? 1 : 0.6,
          }}
        />

        {/* Subtle lime glow edge on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(200,255,0,0.2)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Rating badge */}
        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/5">
          <Star className="w-2.5 h-2.5 text-lime fill-lime" />
          <span className="text-2xs font-semibold text-white tracking-tight">
            {movie.rating?.toFixed(1)}
          </span>
        </div>

        {/* Watchlist heart */}
        <motion.button
          className={cn(
            'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center',
            'bg-black/60 backdrop-blur-md border border-white/5 transition-colors',
            inWatchlist ? 'text-lime' : 'text-white/50 hover:text-white',
          )}
          onClick={handleWatchlist}
          whileTap={{ scale: 0.75 }}
          animate={inWatchlist ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Heart className={cn('w-3.5 h-3.5', inWatchlist && 'fill-lime')} />
        </motion.button>

        {/* Hover genre indicator at bottom */}
        <AnimatePresence>
          {hovered && movie.genreList?.[0] && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 px-3 pb-3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <span className="text-2xs font-semibold text-lime/90 uppercase tracking-[0.12em]">
                {movie.genreList[0]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Text below poster */}
      <div className="mt-2.5 px-0.5">
        <p className={cn(
          'text-sm font-medium leading-snug line-clamp-2 transition-colors duration-200',
          hovered ? 'text-white' : 'text-ink-primary/90',
        )}>
          {movie.title}
        </p>
        <p className="text-xs text-ink-muted mt-0.5 font-normal tabular-nums">
          {movie.year || '—'}
        </p>
      </div>
    </motion.div>
  )
}
