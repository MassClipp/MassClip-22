"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Lock } from "lucide-react"
import type { VimeoVideo } from "@/lib/types"
import VimeoCard from "@/components/vimeo-card"
import VideoSkeleton from "@/components/video-skeleton"
import { Button } from "@/components/ui/button"
import { useUserPlan } from "@/hooks/use-user-plan"

interface ViralClipsSectionProps {
  title: string
  videos: VimeoVideo[]
  isLoading?: boolean
}

export default function ViralClipsSection({ title, videos, isLoading = false }: ViralClipsSectionProps) {
  const [sortedVideos, setSortedVideos] = useState<VimeoVideo[]>([])
  const { isProUser } = useUserPlan()

  useEffect(() => {
    if (videos && videos.length > 0) {
      // For free users, sort alphabetically by title
      // For pro users, keep the original order (likely curated)
      if (!isProUser) {
        const sorted = [...videos].sort((a, b) => {
          // Sort by name, or if names are equal, by URI
          if (a.name && b.name) {
            const nameCompare = a.name.localeCompare(b.name)
            if (nameCompare !== 0) return nameCompare
          }
          return a.uri?.localeCompare(b.uri || "") || 0
        })
        setSortedVideos(sorted)
      } else {
        setSortedVideos(videos)
      }
    }
  }, [videos, isProUser])

  // If no videos or still loading, show skeletons
  if (isLoading || !videos || videos.length === 0) {
    return (
      <section className="mb-12">
        <div className="px-6 mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-extralight tracking-wider text-white">{title}</h2>
          <Link
            href="/category/viral-clips"
            className="text-zinc-400 hover:text-white flex items-center group bg-zinc-900/30 hover:bg-zinc-900/50 px-3 py-1 rounded-full transition-all duration-300"
          >
            <span className="mr-1 text-sm">View All</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="flex overflow-x-auto scrollbar-hide gap-4 px-6 pb-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <VideoSkeleton key={index} />
          ))}
        </div>
      </section>
    )
  }

  // If user is not pro, show upgrade message
  if (!isProUser) {
    return (
      <section className="mb-12">
        <div className="px-6 mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-extralight tracking-wider text-white">{title}</h2>
          <Link
            href="/pricing"
            className="text-crimson hover:text-white flex items-center group bg-zinc-900/30 hover:bg-zinc-900/50 px-3 py-1 rounded-full transition-all duration-300"
          >
            <span className="mr-1 text-sm">Upgrade</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="relative px-6 py-8 mb-4 bg-black/40 border border-crimson/20 rounded-lg backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 p-3 bg-crimson/10 inline-block rounded-full">
              <Lock className="h-8 w-8 text-crimson" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Premium Feature</h3>
            <p className="text-gray-300 mb-6 max-w-lg">
              Viral Clips are exclusive to Creator Pro members. Upgrade your account to access our curated collection of
              trending content.
            </p>
            <Link href="/pricing">
              <Button className="bg-crimson hover:bg-crimson/80 text-white">Upgrade to Creator Pro</Button>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-12">
      <div className="px-6 mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-extralight tracking-wider text-white">{title}</h2>
        <Link
          href="/category/viral-clips"
          className="text-zinc-400 hover:text-white flex items-center group bg-zinc-900/30 hover:bg-zinc-900/50 px-3 py-1 rounded-full transition-all duration-300"
        >
          <span className="mr-1 text-sm">View All</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="flex overflow-x-auto scrollbar-hide gap-4 px-6 pb-4">
        {sortedVideos.map((video, index) => (
          <motion.div
            key={video.uri}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <VimeoCard video={video} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
