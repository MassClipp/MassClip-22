"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { getVideosByCategory } from "@/lib/video-catalog-manager"

interface CategoryVideoSectionProps {
  categorySlug: string
  categoryTitle: string
  limit?: number
}

export default function CategoryVideoSection({ categorySlug, categoryTitle, limit = 6 }: CategoryVideoSectionProps) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true)
        const result = await getVideosByCategory(categorySlug, limit)
        setVideos(result)
      } catch (err) {
        console.error(`Error fetching videos for category ${categorySlug}:`, err)
        setError("Failed to load videos")
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [categorySlug, limit])

  // Helper function to convert our catalog video format to the VimeoVideo format expected by VimeoCard
  const convertToVimeoVideo = (catalogVideo: any) => {
    return {
      uri: `/videos/${catalogVideo.vimeoId}`,
      name: catalogVideo.title,
      description: catalogVideo.description,
      link: catalogVideo.vimeoLink,
      pictures: catalogVideo.vimeoData?.pictures || {
        sizes: [
          {
            width: 1280,
            height: 720,
            link: catalogVideo.thumbnail,
          },
        ],
      },
      // Add other required VimeoVideo properties
      ...catalogVideo.vimeoData,
    }
  }

  if (loading) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{categoryTitle}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, index) => (
            <VideoSkeleton key={`skeleton-${categorySlug}-${index}`} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{categoryTitle}</h2>
        </div>
        <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 text-red-400 text-center">{error}</div>
      </div>
    )
  }

  if (videos.length === 0) {
    return null // Don't show empty categories
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{categoryTitle}</h2>
        <Link
          href={`/category/${categorySlug}`}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {videos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <VimeoCard video={convertToVimeoVideo(video)} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
