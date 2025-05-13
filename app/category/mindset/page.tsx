"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import VimeoCard from "@/components/vimeo-card"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"

export default function MindsetCategory() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Directly use the showcases hook to get all showcase videos
  const { showcaseVideos, loading: loadingShowcases } = useVimeoShowcases()

  useEffect(() => {
    // When showcases are loaded, find videos that match mindset theme
    if (!loadingShowcases && Object.keys(showcaseVideos).length > 0) {
      // Look for showcases with mindset-related names
      const mindsetShowcases = Object.keys(showcaseVideos).filter(
        (name) =>
          name.toLowerCase().includes("mindset") ||
          name.toLowerCase().includes("growth") ||
          name.toLowerCase().includes("introspection") ||
          name.toLowerCase().includes("reflection"),
      )

      let matchedVideos: any[] = []

      // If we have direct showcase matches, use those videos
      if (mindsetShowcases.length > 0) {
        mindsetShowcases.forEach((showcase) => {
          matchedVideos = [...matchedVideos, ...showcaseVideos[showcase]]
        })
      } else {
        // Otherwise, search through all showcases for videos with mindset-related tags or titles
        Object.values(showcaseVideos).forEach((showcaseVideoArray) => {
          const filteredVideos = showcaseVideoArray.filter((video) => {
            // Check video title and description
            const hasMindsetTitle =
              video.name?.toLowerCase().includes("mindset") ||
              video.name?.toLowerCase().includes("growth") ||
              video.name?.toLowerCase().includes("mental") ||
              video.name?.toLowerCase().includes("introspection") ||
              video.description?.toLowerCase().includes("mindset") ||
              video.description?.toLowerCase().includes("growth") ||
              video.description?.toLowerCase().includes("mental") ||
              video.description?.toLowerCase().includes("introspection")

            // Check video tags
            const hasMindsetTags = video.tags?.some(
              (tag: any) =>
                tag.name?.toLowerCase().includes("mindset") ||
                tag.name?.toLowerCase().includes("growth") ||
                tag.name?.toLowerCase().includes("mental") ||
                tag.name?.toLowerCase().includes("introspection") ||
                tag.name?.toLowerCase().includes("reflection") ||
                tag.name?.toLowerCase().includes("meditation") ||
                tag.name?.toLowerCase().includes("awareness"),
            )

            return hasMindsetTitle || hasMindsetTags
          })

          matchedVideos = [...matchedVideos, ...filteredVideos]
        })
      }

      // If we still don't have videos, just use some from any showcase
      if (matchedVideos.length === 0 && Object.values(showcaseVideos).length > 0) {
        // Get videos from the first available showcase
        const firstShowcase = Object.values(showcaseVideos)[0]
        matchedVideos = firstShowcase.slice(0, 12)
      }

      // Remove duplicates by URI
      const uniqueVideos = Array.from(new Map(matchedVideos.map((video) => [video.uri, video])).values())

      setVideos(uniqueVideos)
      setLoading(false)
    }
  }, [showcaseVideos, loadingShowcases])

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
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Mindset</h1>
          <p className="text-white/60 max-w-2xl">
            Explore clips that inspire growth, positive thinking, and mental strength. Perfect for creating content that
            encourages viewers to develop a winning mindset and achieve their goals.
          </p>
        </motion.div>

        {loading ? (
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
            <p className="text-white/60">No mindset videos found. Check back soon for updates.</p>
          </div>
        )}
      </main>
    </div>
  )
}
