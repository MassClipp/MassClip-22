"use client"

import { useState, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, deleteDoc, type Timestamp } from "firebase/firestore"
import DashboardHeader from "@/components/dashboard-header"
import VimeoCard from "@/components/vimeo-card"
import { Button } from "@/components/ui/button"
import { Trash2, Clock } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import { trackFirestoreWrite } from "@/lib/firestore-optimizer"
import VideoSkeletonCard from "@/components/video-skeleton-card"
import { usePaginatedFirestore } from "@/hooks/use-paginated-firestore"
import { motion } from "framer-motion"
import { format } from "date-fns"

export default function HistoryPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const PAGE_SIZE = 12

  // Use the paginated hook for history
  const {
    data: historyItems,
    loading: historyLoading,
    initialLoading,
    error: historyError,
    hasMore,
    loadMore,
    refreshData,
  } = usePaginatedFirestore<{ id: string; video: VimeoVideo; viewedAt: Timestamp }>(
    `users/${user?.uid || "no-user"}/history`,
    PAGE_SIZE,
    "viewedAt",
    "desc",
    "HistoryPage",
    !!user,
  )

  const removeHistoryItem = async (historyId: string) => {
    if (!user) return

    try {
      setLoading(true)
      // Use the user-specific path
      await deleteDoc(doc(db, `users/${user.uid}/history`, historyId))

      // Track the write operation
      trackFirestoreWrite("HistoryPage", 1)

      // Remove from local state
      refreshData()
    } catch (err) {
      console.error("Error removing history item:", err)
      setError("Failed to remove history item")
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

  // If we're in the initial loading state, show the loading component
  if (initialLoading) {
    return <HistoryLoading />
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
            <h1 className="text-4xl font-bold text-white tracking-tight">Watch History</h1>
            <p className="text-gray-400 mt-2 text-lg">Videos you've recently viewed</p>
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

        {/* Empty state */}
        {historyItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 py-16 text-center"
          >
            <div className="max-w-md mx-auto bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-800">
              <p className="text-white text-xl font-medium mb-3">Your watch history is empty</p>
              <p className="text-gray-400 mb-6">Videos you watch will appear here so you can easily find them again.</p>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Browse Videos
              </Button>
            </div>
          </motion.div>
        )}

        {/* History grid */}
        {historyItems.length > 0 && (
          <div className="px-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
            >
              {historyItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  className="relative group"
                  ref={index === historyItems.length - 1 ? lastElementRef : undefined}
                >
                  <div className="overflow-hidden rounded-lg transition-all duration-300 transform group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-red-900/20">
                    <VimeoCard video={item.video} />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center text-xs text-gray-300">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(item.viewedAt.toDate(), "MMM d, h:mm a")}
                    </div>
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
              {historyLoading && !initialLoading && hasMore && (
                <>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <VideoSkeletonCard key={`loading-more-${index}`} />
                  ))}
                </>
              )}
            </motion.div>

            {/* End of content message */}
            {!hasMore && historyItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-gray-500 mt-12 pb-4"
              >
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-700 to-transparent mx-auto mb-4"></div>
                <p>You've reached the end of your watch history</p>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// Create a loading component that matches exactly our design
function HistoryLoading() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-black to-gray-900"></div>

      {/* Subtle animated gradient overlay */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse-slow"></div>

      <DashboardHeader />

      <main className="pt-24 pb-16 relative z-10">
        <div className="px-6 mb-8">
          <div className="h-10 w-48 bg-gray-800/50 rounded-md animate-pulse"></div>
          <div className="h-6 w-64 bg-gray-800/50 rounded-md mt-2 animate-pulse"></div>
        </div>

        {/* Red accent line */}
        <div className="relative px-6 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent w-full"></div>
        </div>

        <div className="px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <VideoSkeletonCard key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
