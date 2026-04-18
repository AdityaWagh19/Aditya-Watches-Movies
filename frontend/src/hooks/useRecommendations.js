import { useState, useEffect } from 'react'
import { getRecommendations } from '@/lib/api'
import { normalizeMovieList } from '@/lib/normalize'

export function useRecommendations(movieId) {
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!movieId) return
    setLoading(true)
    setRecs([])
    setError(null)

    getRecommendations(movieId)
      .then(data => {
        if (data?.recommendations) {
          setRecs(normalizeMovieList(data.recommendations))
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [movieId])

  return { recs, loading, error }
}
