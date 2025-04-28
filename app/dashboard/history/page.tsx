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
import { motion } from "framer-motion"

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
          className="px-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center mb-4 sm:mb-0">
            <Link
              href="/dashboard/user"
              className="text-gray-400 hover:text-white flex items-center mr-4 transition-colors duration-300 group"
            >
              <ChevronLeft className="h-5 w-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-300" />
              <span>Back</span>
            </Link>
            <h1 className="text-4xl font-bold text-white tracking-tight">Viewing History</h1>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={initialLoading}
              className="border-gray-800 bg-black/50 text-white hover:bg-gray-900 hover:text-red-500 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${initialLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {formattedHistory.length > 0 && (
              <Button
                variant="destructive"
                onClick={clearAllHistory}
                disabled={isLoading}
                className="bg-red-600/80 hover:bg-red-700 transition-colors duration-300"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Clear History
              </Button>
            )}
          </div>
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
                <VideoSkeletonCard key={`skeleton-${index}`} showViewedDate={true} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!initialLoading && formattedHistory.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 py-16 text-center"
          >
            <div className="max-w-md mx-auto bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-800">
              <p className="text-white text-xl font-medium mb-3">Your viewing history is empty</p>
              <p className="text-gray-400 mb-6">Videos you watch will appear here for easy access.</p>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                onClick={() => router.push("/dashboard")}
              >
                Browse Videos
              </Button>
            </div>
          </motion.div>
        )}

        {/* History grid */}
        {!initialLoading && formattedHistory.length > 0 && (
          <div className="px-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
            >
              {formattedHistory.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  className="relative group"
                  ref={index === formattedHistory.length - 1 ? lastElementRef : undefined}
                >
                  <div className="overflow-hidden rounded-lg transition-all duration-300 transform group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-red-900/20">
                    <VimeoCard video={item.video} />
                  </div>
                  <div className="mt-2 text-sm text-gray-400 font-medium">
                    <span className="text-xs text-gray-500">Viewed: </span>
                    {item.viewedAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-red-600 border border-red-500/30"
                    onClick={() => removeHistoryItem(item.id)}
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
                    <VideoSkeletonCard key={`loading-more-${index}`} showViewedDate={true} />
                  ))}
                </>
              )}
            </motion.div>

            {/* End of content message */}
            {!hasMore && formattedHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-gray-500 mt-12 pb-4"
              >
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-700 to-transparent mx-auto mb-4"></div>
                <p>You've reached the end of your viewing history</p>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
