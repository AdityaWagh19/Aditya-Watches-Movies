import { create } from 'zustand'

// Simple helper for localStorage persistence
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private mode, quota exceeded)
  }
}

const STORAGE_KEY = 'awm_watchlist'

export const useWatchlistStore = create((set, get) => ({
  // Map of id → movie object for O(1) lookup
  items: loadFromStorage(STORAGE_KEY, {}),

  add(movie) {
    const next = { ...get().items, [movie.id]: movie }
    saveToStorage(STORAGE_KEY, next)
    set({ items: next })
  },

  remove(id) {
    const next = { ...get().items }
    delete next[id]
    saveToStorage(STORAGE_KEY, next)
    set({ items: next })
  },

  toggle(movie) {
    get().items[movie.id] ? get().remove(movie.id) : get().add(movie)
  },

  has(id) {
    return Boolean(get().items[id])
  },

  list() {
    return Object.values(get().items)
  },

  count() {
    return Object.keys(get().items).length
  },
}))
