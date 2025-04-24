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

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="px-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Your Favorites</h1>
            <p className="text-white mt-1">Videos you've saved for quick access</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={initialLoading}
            className="border-gray-700 text-white hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${initialLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error state */}
        {combinedError && (
          <div className="px-6 py-10 text-center">
            <p className="text-red-500">{combinedError}</p>
          </div>
        )}

        {/* Initial loading state */}
        {initialLoading && (
          <div className="px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <VideoSkeletonCard key={`skeleton-${index}`} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!initialLoading && favorites.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-white">You haven't added any favorites yet.</p>
            <p className="text-white mt-2">Browse videos and click the heart icon to add them to your favorites.</p>
          </div>
        )}

        {/* Favorites grid */}
        {!initialLoading && favorites.length > 0 && (
          <div className="px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {favorites.map((favorite, index) => (
                <div
                  key={favorite.id}
                  className="relative group"
                  ref={index === favorites.length - 1 ? lastElementRef : undefined}
                >
                  <VimeoCard video={favorite.video} />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFavorite(favorite.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Loading more indicator */}
              {isLoading && !initialLoading && hasMore && (
                <>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <VideoSkeletonCard key={`loading-more-${index}`} />
                  ))}
                </>
              )}
            </div>

            {/* End of content message */}
            {!hasMore && favorites.length > 0 && (
              <div className="text-center text-gray-500 mt-8 pb-4">You've reached the end of your favorites</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
