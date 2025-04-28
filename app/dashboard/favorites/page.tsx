"use client"

import { useState, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, deleteDoc } from "firebase/firestore"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import { Button } from "@/components/ui/button"
import { Trash2, RefreshCw } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
import VideoSkeletonCard from "@/components/video-skeleton-card"
import { usePaginatedFirestore } from "@/hooks/use-paginated-firestore"
import { motion } from "framer-motion"

export default function FavoritesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const PAGE_SIZE = 12

  // Use the paginated hook for favorites
  const {
    data: favorites,
    loading: favoritesLoading,
    initialLoading,
    error: favoritesError,
    hasMore,
    loadMore,
    refreshData,
  } = usePaginatedFirestore<{ id: string; video: VimeoVideo }>(
    `users/${user?.uid || "no-user"}/favorites`,
    PAGE_SIZE,
    "createdAt",
    "desc",
    "FavoritesPage",
    !!user,
  )

  const removeFavorite = async (favoriteId: string) => {
    if (!user) return

    try {
      setLoading(true)
      // Use the user-specific path
      await deleteDoc(doc(db, `users/${user.uid}/favorites`, favoriteId))

      // Track the write operation
      trackFirestoreWrite("FavoritesPage", 1)

      // Remove from local state
      refreshData()
    } catch (err) {
      console.error("Error removing favorite:", err)
      setError("Failed to remove favorite")
    } finally {
      setLoading(false)
    }
  }

  // Last element ref for infinite scrolling
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (favoritesLoading) return

      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            loadMore()
          }
        },
        { rootMargin: "200px" },
      )

      if (node) observerRef.current.observe(node)
    },
    [favoritesLoading, hasMore, loadMore],
  )

  // Combine errors
  const combinedError = error || (favoritesError ? favoritesError.message : null)
  const isLoading = loading || favoritesLoading

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-black to-gray-900"></div>

      {/* Subtle animated gradient overlay */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse-slow"></div>

      <DashboardHeader />

      <main className="pt-24 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Your Favorites</h1>
            <p className="text-gray-400 mt-2 text-lg">Videos you've saved for quick access</p>
          </div>

          <Button
            variant="outline"
            onClick={refreshData}
            disabled={initialLoading}
            className="border-gray-800 bg-black/50 text-white hover:bg-gray-900 hover:text-red-500 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${initialLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Red accent line */}
        <div className="relative px-6 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent w-full"></div>
        </div>

        {/* Error state */}
        {combinedError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-10 text-center">
            <p className="text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-4">{combinedError}</p>
          </motion.div>
        )}

        {/* Initial loading state */}
        {initialLoading && (
          <div className="px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <VideoSkeletonCard key={`skeleton-${index}`} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!initialLoading && favorites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 py-16 text-center"
          >
            <div className="max-w-md mx-auto bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-800">
              <p className="text-white text-xl font-medium mb-3">You haven't added any favorites yet</p>
              <p className="text-gray-400 mb-6">
                Browse videos and click the heart icon to add them to your favorites for quick access.
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Browse Videos
              </Button>
            </div>
          </motion.div>
        )}

        {/* Favorites grid */}
        {!initialLoading && favorites.length > 0 && (
          <div className="px-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
            >
              {favorites.map((favorite, index) => (
                <motion.div
                  key={favorite.id}
                  variants={itemVariants}
                  className="relative group"
                  ref={index === favorites.length - 1 ? lastElementRef : undefined}
                >
                  <div className="overflow-hidden rounded-lg transition-all duration-300 transform group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-red-900/20">
                    <VimeoCard video={favorite.video} />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-red-600 border border-red-500/30"
                    onClick={() => removeFavorite(favorite.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}

              {/* Loading more indicator */}
              {isLoading && !initialLoading && hasMore && (
                <>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <VideoSkeletonCard key={`loading-more-${index}`} />
                  ))}
                </>
              )}
            </motion.div>

            {/* End of content message */}
            {!hasMore && favorites.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-gray-500 mt-12 pb-4"
              >
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-700 to-transparent mx-auto mb-4"></div>
                <p>You've reached the end of your favorites</p>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
