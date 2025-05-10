"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Search, X, Clock, Brain, Rocket, DollarSign } from "lucide-react"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import VimeoCard from "@/components/vimeo-card"
import CategorySection from "@/components/category-section"
import VideoSkeleton from "@/components/video-skeleton-card"
import { shuffleArray } from "@/lib/utils"
import Link from "next/link"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = searchParams?.get("search") || ""
  const [query, setQuery] = useState(searchQuery)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [shuffledShowcaseVideos, setShuffledShowcaseVideos] = useState<Record<string, any[]>>({})

  // Fetch showcases
  const { showcases, loading: loadingShowcases } = useVimeoShowcases()

  // Handle search
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim()) {
        router.push(`/dashboard?search=${encodeURIComponent(query.trim())}`)
      }
    },
    [query, router],
  )

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery("")
    router.push("/dashboard")
  }, [router])

  // Shuffle videos within each showcase
  useEffect(() => {
    if (showcases && showcases.length > 0) {
      const shuffled: Record<string, any[]> = {}

      showcases.forEach((showcase) => {
        if (showcase.videos && showcase.videos.length > 0) {
          // Create a deep copy of the videos array and shuffle it
          shuffled[showcase.id] = shuffleArray([...showcase.videos])
        }
      })

      setShuffledShowcaseVideos(shuffled)
    }
  }, [showcases])

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Search Section */}
      <div className="pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Find your next viral clip</h1>
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search for clips..."
              className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Category Quick Links Section */}
      <div className="pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/category/hustle-mentality" className="group">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-all">
                <div className="flex items-center mb-2">
                  <div className="bg-crimson/10 p-2 rounded-md mr-3">
                    <Rocket className="h-5 w-5 text-crimson" />
                  </div>
                  <h3 className="font-medium group-hover:text-crimson transition-colors">Hustle Mentality</h3>
                </div>
                <p className="text-xs text-zinc-400">Motivation and mindset clips</p>
              </div>
            </Link>

            <Link href="/category/money-and-wealth" className="group">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-all">
                <div className="flex items-center mb-2">
                  <div className="bg-crimson/10 p-2 rounded-md mr-3">
                    <DollarSign className="h-5 w-5 text-crimson" />
                  </div>
                  <h3 className="font-medium group-hover:text-crimson transition-colors">Money & Wealth</h3>
                </div>
                <p className="text-xs text-zinc-400">Financial advice and wealth building</p>
              </div>
            </Link>

            <Link href="/category/introspection" className="group">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-all">
                <div className="flex items-center mb-2">
                  <div className="bg-crimson/10 p-2 rounded-md mr-3">
                    <Brain className="h-5 w-5 text-crimson" />
                  </div>
                  <h3 className="font-medium group-hover:text-crimson transition-colors">Introspection</h3>
                </div>
                <p className="text-xs text-zinc-400">Self-reflection and personal growth</p>
              </div>
            </Link>

            <Link href="/category/recently-added" className="group">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-all">
                <div className="flex items-center mb-2">
                  <div className="bg-crimson/10 p-2 rounded-md mr-3">
                    <Clock className="h-5 w-5 text-crimson" />
                  </div>
                  <h3 className="font-medium group-hover:text-crimson transition-colors">Recently Added</h3>
                </div>
                <p className="text-xs text-zinc-400">Our newest viral content</p>
              </div>
            </Link>
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => router.push("/category/browse-all")}
              variant="outline"
              className="text-sm border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              Browse All Categories
            </Button>
          </div>
        </div>
      </div>

      {/* Showcases Section */}
      <div className="space-y-8 px-4">
        {searchQuery ? (
          // Search results
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Search results for &quot;{searchQuery}&quot;</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {showcases
                .flatMap((showcase) => showcase.videos || [])
                .filter((video) => {
                  const searchLower = searchQuery.toLowerCase()
                  return (
                    video.name.toLowerCase().includes(searchLower) ||
                    (video.description && video.description.toLowerCase().includes(searchLower))
                  )
                })
                .map((video) => (
                  <div key={video.uri} className="group">
                    <VimeoCard
                      videoId={video.uri.split("/").pop()}
                      title={video.name}
                      thumbnail={video.pictures?.base_link}
                    />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          // All showcases
          showcases.map((showcase) => (
            <div key={showcase.uri} className="max-w-7xl mx-auto">
              <CategorySection title={showcase.name} isEmpty={!showcase.videos || showcase.videos.length === 0}>
                {loadingShowcases
                  ? // Loading skeletons
                    Array.from({ length: 6 }).map((_, i) => <VideoSkeleton key={i} />)
                  : // Shuffled videos for this showcase
                    (shuffledShowcaseVideos[showcase.id] || showcase.videos || []).map((video) => (
                      <VimeoCard
                        key={video.uri}
                        videoId={video.uri.split("/").pop()}
                        title={video.name}
                        thumbnail={video.pictures?.base_link}
                      />
                    ))}
              </CategorySection>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
