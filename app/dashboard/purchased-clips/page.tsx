"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Download, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import type { UserClip } from "@/lib/types"

export default function PurchasedClipsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [clips, setClips] = useState<UserClip[]>([])
  const [filteredClips, setFilteredClips] = useState<UserClip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchPurchasedClips = async () => {
      if (!user) return

      try {
        const response = await fetch("/api/user/purchased-clips")
        if (!response.ok) {
          throw new Error("Failed to fetch purchased clips")
        }

        const data = await response.json()
        setClips(data.clips)
        setFilteredClips(data.clips)
      } catch (error) {
        console.error("Error fetching purchased clips:", error)
        toast({
          title: "Error",
          description: "Failed to load your purchased clips. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPurchasedClips()
  }, [user, toast])

  // Filter clips based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClips(clips)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = clips.filter(
      (clip) =>
        clip.title.toLowerCase().includes(query) ||
        clip.description?.toLowerCase().includes(query) ||
        clip.creatorName?.toLowerCase().includes(query),
    )

    setFilteredClips(filtered)
  }, [searchQuery, clips])

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800 max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-400 mb-6">Please log in to view your purchased clips.</p>
            <Button asChild className="bg-crimson hover:bg-crimson/90 text-white">
              <Link href="/login?redirect=/dashboard/purchased-clips">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Your Purchased Clips</h1>
            <p className="text-gray-400 mt-1">Access all the premium content you've unlocked</p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 text-white w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[9/16] bg-gray-800 rounded-lg"></div>
                <div className="h-4 bg-gray-800 rounded mt-2 w-3/4"></div>
                <div className="h-3 bg-gray-800 rounded mt-2 w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredClips.length === 0 ? (
              <div className="text-center py-16">
                {searchQuery ? (
                  <>
                    <h3 className="text-xl font-medium text-white mb-2">No results found</h3>
                    <p className="text-gray-400">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-medium text-white mb-2">No purchased clips yet</h3>
                    <p className="text-gray-400 mb-6">Explore creator profiles to find premium content</p>
                    <Button asChild className="bg-crimson hover:bg-crimson/90 text-white">
                      <Link href="/dashboard">Browse Clips</Link>
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredClips.map((clip) => (
                  <PurchasedClipCard key={clip.id} clip={clip} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Purchased clip card component
interface PurchasedClipCardProps {
  clip: UserClip
}

function PurchasedClipCard({ clip }: PurchasedClipCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleDownload = () => {
    // Implement download functionality
    if (clip.videoUrl) {
      window.open(clip.videoUrl, "_blank")
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800 overflow-hidden">
      <div
        className="relative aspect-[9/16] group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={clip.thumbnailUrl || "/placeholder.svg?height=480&width=270&query=video+thumbnail"}
            alt={clip.title}
            fill
            className={`object-cover transition-all duration-300 ${isHovered ? "scale-105" : "scale-100"}`}
          />

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(clip.duration)}
          </div>

          {/* Play overlay on hover */}
          <div
            className={`absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 transition-opacity duration-300 ${
              isHovered ? "opacity-100" : ""
            }`}
          >
            <Link href={`/clip/${clip.id}`} className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 5V19L19 12L8 5Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <h3 className="font-medium text-white truncate">{clip.title}</h3>
        {clip.creatorName && <p className="text-xs text-gray-400 truncate mt-1">By {clip.creatorName}</p>}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400 truncate">
            {clip.purchasedAt ? new Date(clip.purchasedAt).toLocaleDateString() : "Purchased"}
          </p>

          {/* Download button */}
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleDownload}>
            <Download className="w-4 h-4 text-crimson" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
