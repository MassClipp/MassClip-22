"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Search, TrendingUp, Clock, Zap } from "lucide-react"
import ModernHeader from "@/components/modern-header"
import { ModernVideoCard } from "@/components/modern-video-card"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"

export default function ModernDashboard() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Get showcases
  const { showcases, loading: showcasesLoading } = useVimeoShowcases()

  // Get videos for search
  const { videos: searchResults, loading: searchLoading } = useVimeoVideos(searchQuery)

  // Get user's recently viewed videos
  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      if (!user) {
        setRecentlyViewed([])
        setIsLoading(false)
        return
      }

      try {
        const historyRef = collection(db, `users/${user.uid}/history`)
        const q = query(historyRef, orderBy("viewedAt", "desc"), limit(12))
        const querySnapshot = await getDocs(q)

        const videos = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return data.video
        })

        setRecentlyViewed(videos)
      } catch (error) {
        console.error("Error fetching recently viewed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentlyViewed()
  }, [user])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <ModernHeader initialSearchQuery={searchQuery} />

      {/* Main Content */}
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Search Results */}
          {searchQuery && (
            <section className="mb-16">
              <div className="flex items-center mb-6">
                <Search className="h-5 w-5 text-inspire-400 mr-2" />
                <h2 className="text-2xl font-bold text-white">
                  Search Results for <span className="text-inspire-400">"{searchQuery}"</span>
                </h2>
              </div>

              {searchLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="aspect-[9/16] rounded-lg bg-zinc-800/50 animate-pulse"></div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {searchResults.map((video, index) => (
                    <motion.div key={video.uri} variants={itemVariants}>
                      <ModernVideoCard video={video} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="card-glass p-8 text-center">
                  <p className="text-zinc-400">No results found for "{searchQuery}"</p>
                </div>
              )}
            </section>
          )}

          {/* Recently Viewed */}
          {!searchQuery && recentlyViewed.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center mb-6">
                <Clock className="h-5 w-5 text-inspire-400 mr-2" />
                <h2 className="text-2xl font-bold text-white">Recently Viewed</h2>
              </div>

              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {recentlyViewed.map((video, index) => (
                  <motion.div key={`recent-${video.uri || index}`} variants={itemVariants}>
                    <ModernVideoCard video={video} />
                  </motion.div>
                ))}
              </motion.div>
            </section>
          )}

          {/* Trending Now */}
          {!searchQuery && (
            <section className="mb-16">
              <div className="flex items-center mb-6">
                <TrendingUp className="h-5 w-5 text-energy-400 mr-2" />
                <h2 className="text-2xl font-bold text-white">Trending Now</h2>
              </div>

              {showcasesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="aspect-[9/16] rounded-lg bg-zinc-800/50 animate-pulse"></div>
                  ))}
                </div>
              ) : (
                showcases.slice(0, 1).map((showcase) => (
                  <div key={showcase.uri}>
                    {showcase.videos && showcase.videos.data && (
                      <motion.div
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {showcase.videos.data.slice(0, 12).map((video, index) => (
                          <motion.div key={`trending-${video.uri}`} variants={itemVariants}>
                            <ModernVideoCard video={video} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                ))
              )}
            </section>
          )}

          {/* Categories */}
          {!searchQuery && (
            <section>
              <div className="flex items-center mb-6">
                <Zap className="h-5 w-5 text-amber-400 mr-2" />
                <h2 className="text-2xl font-bold text-white">Categories</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Money & Wealth Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => (window.location.href = "/category/money-and-wealth")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-900/40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors duration-300">
                      Money & Wealth
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* Hustle Mentality Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => (window.location.href = "/category/hustle-mentality")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-energy-500/20 to-energy-900/40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-energy-300 transition-colors duration-300">
                      Hustle Mentality
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* Introspection Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => (window.location.href = "/category/introspection")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-inspire-500/20 to-inspire-900/40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-inspire-300 transition-colors duration-300">
                      Introspection
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Faith Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => (window.location.href = "/category/faith")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-success-500/20 to-success-900/40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-success-300 transition-colors duration-300">
                      Faith
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* High Energy Motivation Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => (window.location.href = "/category/high-energy-motivation")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-energy-500/20 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors duration-300">
                      High Energy Motivation
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>

                {/* Motivational Speeches Category */}
                <motion.div
                  className="relative overflow-hidden rounded-xl aspect-video group cursor-pointer"
                  onClick={() => (window.location.href = "/category/motivational-speeches")}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-inspire-500/20 to-energy-500/20 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-zinc-900/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-inspire-300 transition-colors duration-300">
                      Motivational Speeches
                    </h3>
                    <div className="flex items-center justify-center text-white/70 text-sm">
                      <span>Explore Collection</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
