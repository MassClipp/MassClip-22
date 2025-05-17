"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { motion } from "framer-motion"
import type { UserClip } from "@/lib/types"
import { Download, Search, RefreshCw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"

export default function PurchasedClipsPage() {
  const { user } = useAuth()
  const [purchasedClips, setPurchasedClips] = useState<UserClip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredClips, setFilteredClips] = useState<UserClip[]>([])

  useEffect(() => {
    async function fetchPurchasedClips() {
      if (!user) return

      try {
        setLoading(true)
        const response = await fetch(`/api/user/purchased-clips`)

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setPurchasedClips(data.clips || [])
        setFilteredClips(data.clips || [])
      } catch (error) {
        console.error("Error fetching purchased clips:", error)
        setError(error instanceof Error ? error.message : "Failed to load clips")
      } finally {
        setLoading(false)
      }
    }

    fetchPurchasedClips()
  }, [user])

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClips(purchasedClips)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = purchasedClips.filter(
      (clip) => clip.title.toLowerCase().includes(query) || clip.description?.toLowerCase().includes(query),
    )

    setFilteredClips(filtered)
  }, [searchQuery, purchasedClips])

  const handleRefresh = () => {
    if (!user) return
    setLoading(true)

    fetch(`/api/user/purchased-clips`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        return response.json()
      })
      .then((data) => {
        setPurchasedClips(data.clips || [])
        setFilteredClips(data.clips || [])
      })
      .catch((error) => {
        console.error("Error refreshing clips:", error)
        setError(error instanceof Error ? error.message : "Failed to refresh clips")
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-black to-gray-900"></div>

      {/* Subtle animated gradient overlay */}
      <div className="fixed inset-0 z-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse-slow"></div>

      <DashboardHeader />

      <main className="pt-24 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Purchased Clips</h1>
            <p className="text-gray-400 mt-2 text-lg">Premium clips you've unlocked</p>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="border-gray-800 bg-black/50 text-white hover:bg-gray-900 hover:text-red-500 transition-all duration-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Red accent line */}
        <div className="relative px-6 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent w-full"></div>
        </div>

        {/* Search Bar */}
        <div className="px-6 mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search purchased clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800 pl-10 text-white placeholder:text-zinc-500 focus:border-crimson"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
                onClick={() => setSearchQuery("")}
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-10 text-center">
            <p className="text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-4">{error}</p>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="bg-zinc-900/50 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-video bg-zinc-800" />
                  <div className="p-4">
                    <div className="h-4 bg-zinc-800 rounded mb-2 w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2 mb-4" />
                    <div className="h-10 bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredClips.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 py-16 text-center"
          >
            <div className="max-w-md mx-auto bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-800">
              {searchQuery ? (
                <>
                  <p className="text-white text-xl font-medium mb-3">No clips match your search</p>
                  <p className="text-gray-400 mb-6">
                    Try different keywords or clear your search to see all your purchased clips.
                  </p>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-white text-xl font-medium mb-3">You haven't purchased any clips yet</p>
                  <p className="text-gray-400 mb-6">Explore creator profiles to discover and purchase premium clips.</p>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300"
                    onClick={() => (window.location.href = "/dashboard")}
                  >
                    Explore Creators
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Clips grid */}
        {!loading && filteredClips.length > 0 && (
          <div className="px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredClips.map((clip) => (
                <motion.div
                  key={clip.id}
                  className="bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all"
                  whileHover={{ translateY: -5 }}
                >
                  <div className="relative aspect-video">
                    <Image
                      src={clip.thumbnailUrl || "/placeholder.svg"}
                      alt={clip.title}
                      layout="fill"
                      objectFit="cover"
                      className="hover:scale-105 transition-transform duration-500 ease-in-out"
                    />

                    {/* Creator badge */}
                    {clip.creatorName && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        {clip.creatorName}
                      </div>
                    )}

                    {/* Duration badge */}
                    {clip.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {Math.floor(clip.duration / 60)}:{(clip.duration % 60).toString().padStart(2, "0")}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-white font-medium mb-1 truncate">{clip.title}</h3>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center text-xs text-zinc-400">
                        <span>
                          Purchased{" "}
                          {formatDistanceToNow(new Date(clip.purchasedAt || clip.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <Button className="w-full bg-crimson hover:bg-crimson/90">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}
