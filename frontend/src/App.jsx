import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import HomePage from '@/pages/HomePage'
import SearchPage from '@/pages/SearchPage'
import MovieDetailPage from '@/pages/MovieDetailPage'
import WatchlistPage from '@/pages/WatchlistPage'

const BASE = '/Aditya-Watches-Movies'

// Page wrapper with fade-up transition
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path={`${BASE}/`} element={
            <PageTransition><HomePage /></PageTransition>
          } />
          <Route path={`${BASE}/search`} element={
            <PageTransition><SearchPage /></PageTransition>
          } />
          <Route path={`${BASE}/movie/:id`} element={
            <PageTransition><MovieDetailPage /></PageTransition>
          } />
          <Route path={`${BASE}/watchlist`} element={
            <PageTransition><WatchlistPage /></PageTransition>
          } />
          {/* Fallback */}
          <Route path="*" element={
            <PageTransition>
              <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="font-display text-6xl font-bold text-ink-primary">404</p>
                <p className="text-ink-muted">Page not found</p>
                <a href={`${BASE}/`} className="text-lime text-sm underline">Go home</a>
              </div>
            </PageTransition>
          } />
        </Routes>
      </AnimatePresence>
    </div>
  )
}
