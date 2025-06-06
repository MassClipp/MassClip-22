"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  deleteDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { RefreshCw, Heart, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import VimeoCard from "@/components/vimeo-card"
import CreatorUploadCard from "@/components/creator-upload-card"

interface FavoriteVideo {
  id: string
  videoId: string
  type: "vimeo" | "creator-upload"
  createdAt: any
  rawData: any
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [favorites, setFavorites] = useState<FavoriteVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const PAGE_SIZE = 12

  // Load favorites from Firestore
  const loadFavorites = async (isRefresh = false) => {
    if (!user) return

    try {
      if (isRefresh) {
        setLoading(true)
        setFavorites([])
        setLastDoc(null)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      const favoritesRef = collection(db, `users/${user.uid}/favorites`)
      let q = query(favoritesRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE))

      if (!isRefresh && lastDoc) {
        q = query(favoritesRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE))
      }

      const querySnapshot = await getDocs(q)
      const newFavorites: FavoriteVideo[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        let favoriteVideo: FavoriteVideo

        // Handle different data structures
        if (data.video) {
          favoriteVideo = {
            id: doc.id,
            videoId: data.videoId || data.video.uri?.split("/").pop() || doc.id,
            type: "vimeo",
            createdAt: data.createdAt,
            rawData: data.video,
          }
        } else if (data.creatorUpload) {
          favoriteVideo = {
            id: doc.id,
            videoId: data.videoId || data.creatorUpload.id,
            type: "creator-upload",
            createdAt: data.createdAt,
            rawData: data.creatorUpload,
          }
        } else {
          // Fallback for any other format
          favoriteVideo = {
            id: doc.id,
            videoId: data.videoId || doc.id,
            type: "vimeo",
            createdAt: data.createdAt,
            rawData: data,
          }
        }

        newFavorites.push(favoriteVideo)
      })

      if (isRefresh) {
        setFavorites(newFavorites)
      } else {
        setFavorites((prev) => [...prev, ...newFavorites])
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null)
      setHasMore(querySnapshot.docs.length === PAGE_SIZE)
      setError(null)
    } catch (err) {
      console.error("Error loading favorites:", err)
      setError("Failed to load favorites")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Remove favorite
  const removeFavorite = async (favoriteId: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, `users/${user.uid}/favorites`, favoriteId))
      setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteId))
      toast({
        title: "Removed from favorites",
        description: "Video removed from your favorites",
      })
    } catch (err) {
      console.error("Error removing favorite:", err)
      toast({
        title: "Error",
        description: "Failed to remove favorite",
        variant: "destructive",
      })
    }
  }

  // Intersection observer for infinite scroll
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadingMore) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            loadFavorites(false)
          }
        },
        { rootMargin: "200px" },
      )
      if (node) observerRef.current.observe(node)
    },
    [loadingMore, hasMore],
  )

  // Load favorites on mount
  useEffect(() => {
    if (user) {
      loadFavorites(true)
    }
  }, [user])

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

  if (loading) {
    return <FavoritesLoading />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Your Favorites</h1>
          <p className="text-zinc-400">Videos you've saved for quick access</p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadFavorites(true)}
          disabled={loading}
          className="border-zinc-800 bg-black/50 text-white hover:bg-zinc-900 hover:text-red-500 transition-all duration-300 w-fit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
          <p className="text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</p>
        </motion.div>
      )}

      {/* Empty state */}
      {favorites.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-16 text-center"
        >
          <div className="max-w-md mx-auto bg-zinc-900/50 backdrop-blur-sm p-8 rounded-xl border border-zinc-800">
            <Heart className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-white text-xl font-medium mb-3">You haven't added any favorites yet</p>
            <p className="text-zinc-400 mb-6">
              Browse videos and click the heart icon to add them to your favorites for quick access.
            </p>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
              onClick={() => (window.location.href = "/dashboard/explore")}
            >
              Browse Videos
            </Button>
          </div>
        </motion.div>
      )}

      {/* Favorites grid */}
      {favorites.length > 0 && (
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
              <div className="relative">
                {/* Render the appropriate card component */}
                {favorite.type === "vimeo" ? (
                  <VimeoCard video={favorite.rawData} />
                ) : (
                  <CreatorUploadCard video={favorite.rawData} />
                )}

                {/* Remove button overlay */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-red-600 border border-red-500/30 h-8 w-8 z-30"
                  onClick={() => removeFavorite(favorite.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}

          {/* Loading more indicator */}
          {loadingMore && (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`loading-${index}`} className="aspect-[9/16] bg-zinc-800/50 rounded-lg animate-pulse" />
              ))}
            </>
          )}
        </motion.div>
      )}

      {/* End of content message */}
      {!hasMore && favorites.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-zinc-500 mt-12 pb-4"
        >
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto mb-4"></div>
          <p>You've reached the end of your favorites</p>
        </motion.div>
      )}
    </div>
  )
}

// Loading component
function FavoritesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-zinc-800/50 rounded-md animate-pulse"></div>
          <div className="h-5 w-64 bg-zinc-800/50 rounded-md mt-2 animate-pulse"></div>
        </div>
        <div className="h-10 w-24 bg-zinc-800/50 rounded-md animate-pulse"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-[9/16] bg-zinc-800/50 rounded-lg animate-pulse" />
            <div className="h-4 bg-zinc-800/50 rounded animate-pulse" />
            <div className="h-3 w-2/3 bg-zinc-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
