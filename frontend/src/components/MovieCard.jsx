import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import { buildPosterUrl } from '@/lib/tmdb'
import { useWatchlistStore } from '@/store/useWatchlistStore'
import { cn } from '@/lib/utils'

export default function MovieCard({ movie, index = 0, size = 'md' }) {
  const navigate = useNavigate()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { has, toggle } = useWatchlistStore()
  const inWatchlist = has(movie.id)

  const sizeClasses = {
    sm: 'w-32 md:w-36',
    md: 'w-40 md:w-44',
    lg: 'w-48 md:w-56',
  }

  function handleClick() {
    navigate(`/movie/${movie.id}`)
  }

  function handleWatchlist(e) {
    e.stopPropagation()
    toggle(movie)
  }

  return (
    <motion.div
      className={cn('relative flex-shrink-0 cursor-pointer', sizeClasses[size])}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleClick}
      whileHover={{ y: -6 }}
    >
      {/* Poster */}
      <div className="relative overflow-hidden rounded-xl aspect-[2/3] bg-bg-elevated">
        {/* Skeleton shimmer */}
        {!imgLoaded && (
          <div className="absolute inset-0 skeleton rounded-xl" />
        )}

        <img
          src={buildPosterUrl(movie.poster)}
          alt={movie.title}
          onLoad={() => setImgLoaded(true)}
          className={cn(
            'w-full h-full object-cover transition-all duration-500',
            imgLoaded ? 'opacity-100' : 'opacity-0',
            hovered && 'scale-105'
          )}
        />

        {/* Gradient overlay on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Rating badge — always visible */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
          <Star className="w-2.5 h-2.5 text-lime fill-lime" />
          <span className="text-2xs font-semibold text-ink-primary">
            {movie.rating?.toFixed(1)}
          </span>
        </div>

        {/* Watchlist heart button */}
        <motion.button
          className={cn(
            'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center',
            'bg-black/70 backdrop-blur-sm transition-colors',
            inWatchlist ? 'text-lime' : 'text-ink-secondary hover:text-ink-primary'
          )}
          onClick={handleWatchlist}
          whileTap={{ scale: 0.8 }}
          animate={{ scale: inWatchlist ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          <Heart
            className={cn('w-3.5 h-3.5', inWatchlist && 'fill-lime')}
          />
        </motion.button>

        {/* Hover info overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 p-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              {movie.genreList?.[0] && (
                <span className="text-2xs font-medium text-lime/90 uppercase tracking-wider">
                  {movie.genreList[0]}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Text below poster */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium text-ink-primary leading-tight line-clamp-2 font-display">
          {movie.title}
        </p>
        <p className="text-xs text-ink-muted mt-0.5">{movie.year || '—'}</p>
      </div>
    </motion.div>
  )
}
