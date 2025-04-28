"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVimeoVideos } from "@/hooks/use-vimeo-videos"
import VimeoCard from "@/components/vimeo-card"

export default function HustleMentalityCategory() {
  const router = useRouter()
  const { videos, loading } = useVimeoVideos()
  const [hustleVideos, setHustleVideos] = useState<any[]>([])

  useEffect(() => {
    if (!loading && videos.length > 0) {
      // Filter videos that might be related to hustle mentality
      // In a real app, you would have proper tagging or categorization
      const filtered = videos.filter(
        (video) =>
          video.name?.toLowerCase().includes("hustle") ||
          video.description?.toLowerCase().includes("hustle") ||
          video.tags?.some(
            (tag: string) =>
              tag.toLowerCase().includes("hustle") ||
              tag.toLowerCase().includes("grind") ||
              tag.toLowerCase().includes("entrepreneur"),
          ),
      )

      setHustleVideos(filtered.length > 0 ? filtered : videos.slice(0, 12))
    }
  }, [videos, loading])

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
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Hustle Mentality</h1>
          <p className="text-white/60 max-w-2xl">
            Fuel your content with high-energy clips that embody the grind, persistence, and entrepreneurial spirit.
            Perfect for motivational and business-focused content.
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
            {hustleVideos.map((video, index) => (
              <motion.div key={`video-${video.uri || index}`} variants={itemVariants}>
                <VimeoCard video={video} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && hustleVideos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/60">No hustle mentality videos found. Check back soon for updates.</p>
          </div>
        )}
      </main>
    </div>
  )
}
