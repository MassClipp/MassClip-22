"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Play, Download, File, Music, Loader2, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
  fileSize: number
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string
  createdAt?: any
}

interface ProductBoxContentDisplayProps {
  productBoxId: string
  contentCount: number
  className?: string
}

// Format file size helper function
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

export default function ProductBoxContentDisplay({
  productBoxId,
  contentCount,
  className = "",
}: ProductBoxContentDisplayProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Fetch content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get authenticated user
        if (!user) {
          setError("Authentication required")
          return
        }

        const token = await user.getIdToken()

        // Use the API endpoint instead of direct Firestore query
        const response = await fetch(`/api/creator/product-boxes/${productBoxId}/content`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch content`)
        }

        const data = await response.json()
        const contentItems = data.content || []

        // Map content items with proper type detection
        const mappedItems = contentItems.map((item: any) => ({
          id: item.id,
          title: item.title || item.filename || "Untitled",
          fileUrl: item.fileUrl || item.downloadUrl || "",
          thumbnailUrl: item.thumbnailUrl || "",
          mimeType: item.mimeType || "application/octet-stream",
          fileSize: item.fileSize || 0,
          contentType: item.mimeType?.startsWith("video/")
            ? ("video" as const)
            : item.mimeType?.startsWith("audio/")
              ? ("audio" as const)
              : item.mimeType?.startsWith("image/")
                ? ("image" as const)
                : ("document" as const),
          duration: item.duration,
          filename: item.filename || `file-${item.id}`,
          createdAt: item.createdAt,
        }))

        setContent(mappedItems)
      } catch (err) {
        console.error("Error fetching content:", err)
        setError(err instanceof Error ? err.message : "Failed to load content")
      } finally {
        setLoading(false)
      }
    }

    if (productBoxId && user) {
      fetchContent()
    }
  }, [productBoxId, user])

  // Handle download
  const handleDownload = (item: ContentItem) => {
    if (!item.fileUrl) {
      toast({
        title: "Download Error",
        description: "No download link available for this file.",
        variant: "destructive",
      })
      return
    }

    try {
      const link = document.createElement("a")
      link.href = item.fileUrl
      link.download = item.filename || `${item.title}.${item.mimeType.split("/")[1] || "file"}`
      link.click()

      toast({
        title: "Download Started",
        description: "Your file is downloading",
      })
    } catch (error) {
      console.error("Download failed:", error)
      toast({
        title: "Download Error",
        description: "There was an issue starting your download.",
        variant: "destructive",
      })
    }
  }

  // Simple Video Card Component
  const VideoCard = ({ item }: { item: ContentItem }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    // Handle play/pause
    const togglePlay = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!videoRef.current) return

      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.error("Error playing video:", err))
      }
    }

    return (
      <div className="flex-shrink-0 w-full">
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 group">
          {item.contentType === "video" ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                preload="metadata"
                onClick={togglePlay}
                onEnded={() => setIsPlaying(false)}
                poster={item.thumbnailUrl}
              >
                <source src={item.fileUrl} type="video/mp4" />
              </video>

              {/* Border on hover */}
              <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200"></div>

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
                </button>
              </div>

              {/* Download button */}
              <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(item)
                  }}
                  aria-label="Download"
                >
                  <Download className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </>
          ) : item.contentType === "audio" ? (
            <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
              <Music className="h-8 w-8 text-purple-400" />
            </div>
          ) : item.contentType === "image" ? (
            <img src={item.fileUrl || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <File className="h-8 w-8 text-zinc-400" />
            </div>
          )}
        </div>

        {/* File info below video */}
        <div className="mt-1 flex justify-between items-center">
          <span className="text-xs text-zinc-400">{item.contentType}</span>
          <span className="text-xs text-zinc-400">{formatFileSize(item.fileSize)}</span>
        </div>
      </div>
    )
  }

  // Display content
  const displayContent = showAll ? content : content.slice(0, 6)

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-zinc-400">{error}</p>
      </div>
    )
  }

  if (content.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-zinc-400">No content available for preview</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Content Preview</h3>
          <Badge variant="outline" className="text-xs">
            {contentCount} items
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <AnimatePresence>
          {displayContent.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <VideoCard item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {content.length > 6 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            {showAll ? (
              <>
                Show Less <ChevronUp className="ml-1 h-3 w-3" />
              </>
            ) : (
              <>
                Show All {content.length} Items <ChevronDown className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
