import { useState, useEffect } from 'react'
import { getPopularMovies } from '@/lib/api'
import { normalizeMovieList } from '@/lib/normalize'

export function usePopularMovies() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPopularMovies()
      .then(data => {
        setMovies(normalizeMovieList(data))
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { movies, loading, error }
}
