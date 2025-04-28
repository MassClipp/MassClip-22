"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVimeoTagVideos } from "@/hooks/use-vimeo-tag-videos"
import VimeoCard from "@/components/vimeo-card"

export default function IntrospectionCategory() {
  const router = useRouter()
  const { videos, loading, hasMore, loadMore } = useVimeoTagVideos("introspection")
  const [loadingMore, setLoadingMore] = useState(false)

  // Handle infinite scroll
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500 &&
      hasMore &&
      !loadingMore
    ) {
      setLoadingMore(true)
      loadMore()
      setTimeout(() => setLoadingMore(false), 1000)
    }
  }

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasMore, loadingMore])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 premium-gradient">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 pt-20">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/5 -ml-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Introspection</h1>
          <p className="text-white/60 max-w-2xl">
            Explore clips that inspire deep reflection, self-awareness, and mindfulness. Perfect for creating content
            that encourages viewers to look inward and grow.
          </p>
        </motion.div>

        {loading && videos.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="aspect-[9/16] bg-zinc-900/50 rounded-md animate-pulse"></div>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {videos.map((video, index) => (
              <motion.div key={`video-${video.uri || index}`} variants={itemVariants}>
                <VimeoCard video={video} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && videos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/60">No introspection videos found. Check back soon for updates.</p>
          </div>
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] opacity-60"></div>
          </div>
        )}
      </main>
    </div>
  )
}
