import { useState, useEffect, useRef } from 'react'
import { getMovieIndex } from '@/lib/api'
import { normalizeMovieList } from '@/lib/normalize'

/**
 * Load and cache the full 22K movie index.
 * Only fetched once — subsequent calls return the same cached data.
 */
export function useMovieIndex() {
  const [index, setIndex] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    getMovieIndex()
      .then(data => {
        setIndex(normalizeMovieList(data))
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { index, loading, error }
}
