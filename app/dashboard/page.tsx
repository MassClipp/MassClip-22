"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Grid, Clock, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { VimeoCard } from "@/components/vimeo-card"
import { NICHE_CATEGORIES } from "@/lib/category-constants"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [recentlyAdded, setRecentlyAdded] = useState<any[]>([])

  // Get search query from URL if present
  useEffect(() => {
    const query = searchParams?.get("search")
    if (query) {
      setSearchQuery(query)
    } else {
      // Try to get from localStorage
      const savedQuery = localStorage.getItem("lastSearchQuery")
      if (savedQuery) {
        setSearchQuery(savedQuery)
      }
    }
  }, [searchParams])

  // Fetch videos
  useEffect(() => {
    if (!user) return

    const fetchVideos = async () => {
      try {
        setLoading(true)

        // If search query exists, search for videos
        if (searchQuery) {
          const response = await fetch(`/api/vimeo?query=${encodeURIComponent(searchQuery)}`)
          if (!response.ok) throw new Error("Failed to fetch videos")
          const data = await response.json()
          setVideos(data.data || [])
        } else {
          // Otherwise fetch recently added videos
          const response = await fetch("/api/vimeo?sort=date")
          if (!response.ok) throw new Error("Failed to fetch videos")
          const data = await response.json()
          setRecentlyAdded(data.data || [])
          setVideos([])
        }
      } catch (error) {
        console.error("Error fetching videos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [user, searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      localStorage.setItem("lastSearchQuery", searchQuery)
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    localStorage.removeItem("lastSearchQuery")
    router.push("/dashboard")
  }

  if (!user) {
    return null // Auth provider will handle redirect
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-24 md:pb-16">
      {/* Search Bar */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search for clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Niche Categories Section */}
      {!searchQuery && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
            <Link
              href="/dashboard/categories"
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <Grid className="w-4 h-4" />
              <span>View All</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {NICHE_CATEGORIES.map((category) => (
              <Link
                key={category.id}
                href={`/dashboard/niches/${category.id}`}
                className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900/60 transition-colors group"
              >
                <div className="flex flex-col items-center justify-center text-center h-full">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3 group-hover:bg-crimson/20 transition-colors">
                    <span className="text-xl">{category.label.charAt(0)}</span>
                  </div>
                  <h3 className="font-medium">{category.label}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search Results or Recently Added */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{searchQuery ? "Search Results" : "Recently Added"}</h2>
          {!searchQuery && (
            <Link
              href="/category/recently-added"
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <Clock className="w-4 h-4" />
              <span>View All</span>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900/30 border border-zinc-800 rounded-xl aspect-video animate-pulse"
              ></div>
            ))}
          </div>
        ) : searchQuery && videos.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-12 text-center">
            <h3 className="text-xl font-medium mb-2">No results found</h3>
            <p className="text-zinc-400 mb-6">We couldn't find any videos matching "{searchQuery}".</p>
            <Button onClick={clearSearch} className="bg-crimson hover:bg-crimson-dark">
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(searchQuery ? videos : recentlyAdded).map((video) => (
              <VimeoCard key={video.uri} video={video} />
            ))}
          </div>
        )}
      </section>

      {/* Upload CTA */}
      <div className="fixed bottom-24 md:bottom-8 right-8 z-40">
        <Button
          onClick={() => router.push("/dashboard/upload")}
          className="bg-crimson hover:bg-crimson-dark text-white rounded-full w-14 h-14 p-0 shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}
