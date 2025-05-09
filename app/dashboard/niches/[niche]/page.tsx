"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { VimeoCard } from "@/components/vimeo-card"
import { getNicheLabelById } from "@/lib/category-constants"

export default function NichePage() {
  const { niche } = useParams() as { niche: string }
  const router = useRouter()
  const { user } = useAuth()
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const nicheLabel = getNicheLabelById(niche)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchVideos = async () => {
      try {
        setLoading(true)

        // Fetch videos from Vimeo with the specific tag
        const response = await fetch(`/api/vimeo?tag=${encodeURIComponent(niche)}`)

        if (!response.ok) {
          throw new Error("Failed to fetch videos")
        }

        const data = await response.json()
        setVideos(data.data || [])
      } catch (error) {
        console.error("Error fetching videos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [niche, user, router])

  // Filter videos based on search query
  const filteredVideos = videos.filter(
    (video) =>
      video.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description && video.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{nicheLabel}</h1>
          <p className="text-zinc-400">Browse videos in the {nicheLabel.toLowerCase()} category</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder={`Search ${nicheLabel} videos...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent"
            />
          </div>
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900/30 border border-zinc-800 rounded-xl aspect-video animate-pulse"
              ></div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-12 text-center">
            <h3 className="text-xl font-medium mb-2">No videos found</h3>
            <p className="text-zinc-400 mb-6">
              {videos.length === 0
                ? `There are no videos in the ${nicheLabel} category yet.`
                : "No videos match your search criteria."}
            </p>
            <Button onClick={() => router.push("/dashboard/upload")} className="bg-crimson hover:bg-crimson-dark">
              Upload Content
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <VimeoCard key={video.uri} video={video} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
