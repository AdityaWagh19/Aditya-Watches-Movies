import { motion } from 'framer-motion'
import MovieCard from './MovieCard'

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export default function MovieGrid({ movies = [], size = 'md', emptyMessage = 'No movies found.' }) {
  if (!movies.length) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-muted text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {movies.map((movie, i) => (
        <MovieCard key={movie.id} movie={movie} index={i} size={size} />
      ))}
    </motion.div>
  )
}
