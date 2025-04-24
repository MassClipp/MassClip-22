"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Trash2, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { deleteDoc, doc, writeBatch } from "firebase/firestore"
import type { VimeoVideo } from "@/lib/types"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
import VideoSkeletonCard from "@/components/video-skeleton-card"
import { usePaginatedFirestore } from "@/hooks/use-paginated-firestore"

export default function HistoryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const PAGE_SIZE = 12

  // Use the paginated hook for history
  const {
    data: history,
    loading: historyLoading,
    initialLoading,
    error: historyError,
    hasMore,
    loadMore,
    refreshData,
  } = usePaginatedFirestore<{ id: string; video: VimeoVideo; viewedAt: any }>(
    `users/${user?.uid || "no-user"}/history`,
    PAGE_SIZE,
    "viewedAt",
    "desc",
    "HistoryPage",
    !!user,
  )

  // Format history items with proper dates
  const formattedHistory = history.map((item) => ({
    ...item,
    viewedAt: item.viewedAt?.toDate ? item.viewedAt.toDate() : new Date(item.viewedAt),
  }))

  const removeHistoryItem = async (itemId: string) => {
    if (!user) return

    try {
      setLoading(true)
      // Use the user-specific path
      await deleteDoc(doc(db, `users/${user.uid}/history`, itemId))

      // Track the write operation
      trackFirestoreWrite("HistoryPage", 1)

      // Refresh data
      refreshData()
    } catch (err) {
      console.error("Error removing history item:", err)
      setError("Failed to remove item from history")
    } finally {
      setLoading(false)
    }
  }

  const clearAllHistory = async () => {
    if (!user || !window.confirm("Are you sure you want to clear your entire viewing history?")) return

    try {
      setLoading(true)

      // Use a batch write for better performance
      const batch = writeBatch(db)
      let operationCount = 0

      formattedHistory.forEach((item) => {
        batch.delete(doc(db, `users/${user.uid}/history`, item.id))
        operationCount++
      })

      await batch.commit()

      // Track the write operations
      trackFirestoreWrite("HistoryPage", operationCount)

      // Clear cache and refresh
      refreshData()
    } catch (err) {
      console.error("Error clearing history:", err)
      setError("Failed to clear viewing history")
    } finally {
      setLoading(false)
    }
  }

  // Last element ref for infinite scrolling
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (historyLoading) return

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
    [historyLoading, hasMore, loadMore],
  )

  // Combine errors
  const combinedError = error || (historyError ? historyError.message : null)
  const isLoading = loading || historyLoading

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <DashboardHeader />

      <main className="pt-20 pb-16 relative z-10">
        <div className="px-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <Link href="/dashboard/user" className="text-gray-400 hover:text-white flex items-center mr-4">
              <ChevronLeft className="h-5 w-5" />
              Back
            </Link>
            <h1 className="text-3xl font-bold text-white">Viewing History</h1>
          </div>

          <div className="flex gap-2">
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

            {formattedHistory.length > 0 && (
              <Button variant="destructive" size="sm" onClick={clearAllHistory} disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-2" /> Clear History
              </Button>
            )}
          </div>
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
                <VideoSkeletonCard key={`skeleton-${index}`} showViewedDate={true} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!initialLoading && formattedHistory.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-white">Your viewing history is empty.</p>
            <p className="text-gray-500 mt-2">Videos you watch will appear here.</p>
            <Button className="mt-6 bg-red-600 hover:bg-red-700 text-white" onClick={() => router.push("/dashboard")}>
              Browse Videos
            </Button>
          </div>
        )}

        {/* History grid */}
        {!initialLoading && formattedHistory.length > 0 && (
          <div className="px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {formattedHistory.map((item, index) => (
                <div
                  key={item.id}
                  className="relative group"
                  ref={index === formattedHistory.length - 1 ? lastElementRef : undefined}
                >
                  <VimeoCard video={item.video} />
                  <div className="mt-1 text-xs text-white">Viewed: {item.viewedAt.toLocaleDateString()}</div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeHistoryItem(item.id)}
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
                    <VideoSkeletonCard key={`loading-more-${index}`} showViewedDate={true} />
                  ))}
                </>
              )}
            </div>

            {/* End of content message */}
            {!hasMore && formattedHistory.length > 0 && (
              <div className="text-center text-gray-500 mt-8 pb-4">You've reached the end of your viewing history</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
