"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Play, Download, File, Music, Loader2, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

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

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

// Handle preview/play
const handlePreview = (item: ContentItem) => {
  if (item.contentType === "video" || item.contentType === "audio") {
    // Open in new tab for preview
    window.open(item.fileUrl, "_blank")
  } else if (item.contentType === "image") {
    // Open image in new tab
    window.open(item.fileUrl, "_blank")
  } else {
    // Download document
    const link = document.createElement("a")
    link.href = item.fileUrl
    link.download = item.filename
    link.click()
  }
}

// Interactive Video Card Component
const VideoCard = ({ item }: { item: ContentItem }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()

    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    } else {
      // Pause all other videos first
      document.querySelectorAll("video").forEach((v) => {
        if (v !== videoRef.current) {
          v.pause()
          v.currentTime = 0
        }
      })

      videoRef.current.muted = false
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error("Error playing video:", error)
        })
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }

  if (item.contentType === "video") {
    return (
      <div
        className="group relative transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Video container with 9:16 aspect ratio */}
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md border border-transparent hover:border-white/20 transition-all duration-300">
          {/* Raw video element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover cursor-pointer"
            preload="metadata"
            muted={false}
            playsInline
            onEnded={handleVideoEnd}
            onClick={togglePlay}
            controls={false}
          >
            <source src={item.fileUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Play/Pause button - only show on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
          </div>

          {/* Overlay gradient for better visibility - only on hover */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          {/* Content Type Badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs border-0 bg-red-600/80 text-white">
              VIDEO
            </Badge>
          </div>

          {/* File Size */}
          {item.fileSize > 0 && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="outline" className="text-xs border-zinc-600 bg-black/50 text-white">
                {formatFileSize(item.fileSize)}
              </Badge>
            </div>
          )}
        </div>

        {/* Video title */}
        <div className="mt-2">
          <h3 className="text-sm text-white font-light line-clamp-2">{item.title}</h3>
        </div>
      </div>
    )
  }

  // For non-video content, use the existing display logic
  return (
    <div
      className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative group cursor-pointer"
      onClick={() => handlePreview(item)}
    >
      {item.contentType === "audio" ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-4">
          <Music className="h-12 w-12 text-purple-400 mb-2" />
          <h4 className="text-sm font-medium text-white text-center line-clamp-2">{item.title}</h4>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      ) : item.contentType === "image" ? (
        <div className="w-full h-full">
          <img
            src={item.fileUrl || item.thumbnailUrl || "/placeholder.svg"}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Download className="h-12 w-12 text-white" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 p-4">
          <File className="h-12 w-12 text-zinc-400 mb-2" />
          <h4 className="text-sm font-medium text-white text-center line-clamp-2">{item.title}</h4>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Download className="h-12 w-12 text-white" />
          </div>
        </div>
      )}

      {/* Content Type Badge */}
      <div className="absolute top-2 left-2">
        <Badge
          variant="secondary"
          className={`text-xs border-0 ${
            item.contentType === "audio"
              ? "bg-purple-600/80 text-white"
              : item.contentType === "image"
                ? "bg-blue-600/80 text-white"
                : "bg-zinc-600/80 text-white"
          }`}
        >
          {item.contentType.toUpperCase()}
        </Badge>
      </div>

      {/* File Size */}
      {item.fileSize > 0 && (
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="text-xs border-zinc-600 bg-black/50 text-white">
            {formatFileSize(item.fileSize)}
          </Badge>
        </div>
      )}
    </div>
  )
}

export default function ProductBoxContentDisplay({
  productBoxId,
  contentCount,
  className = "",
}: ProductBoxContentDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Add useEffect to fetch content immediately
  useEffect(() => {
    fetchContentItems()
  }, [productBoxId])

  // Fetch content items when expanded
  const fetchContentItems = async () => {
    if (contentItems.length > 0) return // Already fetched

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Content Display] Fetching content for product box: ${productBoxId}`)

      // Method 1: Try to fetch from productBoxContent collection first
      const contentQuery = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBoxId))
      const contentSnapshot = await getDocs(contentQuery)

      const items: ContentItem[] = []

      if (!contentSnapshot.empty) {
        // Found productBoxContent entries
        contentSnapshot.forEach((doc) => {
          const data = doc.data()
          const item: ContentItem = {
            id: doc.id,
            title: data.title || data.filename || "Untitled",
            fileUrl: data.fileUrl || "",
            thumbnailUrl: data.thumbnailUrl || "",
            mimeType: data.mimeType || "application/octet-stream",
            fileSize: data.fileSize || 0,
            contentType: getContentType(data.mimeType || ""),
            duration: data.duration || undefined,
            filename: data.filename || `${doc.id}.file`,
            createdAt: data.createdAt,
          }

          if (item.fileUrl && item.fileUrl.startsWith("http")) {
            items.push(item)
          }
        })
      } else {
        // Method 2: Fallback to fetching from uploads via contentItems array
        console.log("🔄 [Content Display] No productBoxContent found, trying contentItems fallback")

        // Get the product box to access contentItems
        const productBoxDoc = await getDocs(
          query(collection(db, "productBoxes"), where("__name__", "==", productBoxId)),
        )

        if (!productBoxDoc.empty) {
          const productBoxData = productBoxDoc.docs[0].data()
          const contentItemIds = productBoxData.contentItems || []

          if (contentItemIds.length > 0) {
            // Fetch each upload
            for (const uploadId of contentItemIds) {
              try {
                const uploadDoc = await getDocs(query(collection(db, "uploads"), where("__name__", "==", uploadId)))

                if (!uploadDoc.empty) {
                  const uploadData = uploadDoc.docs[0].data()
                  const item: ContentItem = {
                    id: uploadId,
                    title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
                    fileUrl: uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl || "",
                    thumbnailUrl: uploadData.thumbnailUrl || "",
                    mimeType: uploadData.mimeType || uploadData.fileType || "application/octet-stream",
                    fileSize: uploadData.fileSize || uploadData.size || 0,
                    contentType: getContentType(uploadData.mimeType || uploadData.fileType || ""),
                    duration: uploadData.duration || undefined,
                    filename: uploadData.filename || uploadData.originalFileName || `${uploadId}.file`,
                    createdAt: uploadData.createdAt || uploadData.uploadedAt,
                  }

                  if (item.fileUrl && item.fileUrl.startsWith("http")) {
                    items.push(item)
                  }
                }
              } catch (uploadError) {
                console.error(`❌ [Content Display] Error fetching upload ${uploadId}:`, uploadError)
              }
            }
          }
        }
      }

      // Sort by creation date (newest first)
      items.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
        const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
        return bTime - aTime
      })

      setContentItems(items)
      console.log(`✅ [Content Display] Loaded ${items.length} content items`)

      if (items.length === 0) {
        setError("No content items found")
      }
    } catch (err) {
      console.error("❌ [Content Display] Error fetching content:", err)
      setError("Failed to load content items")
      toast({
        title: "Error",
        description: "Failed to load content items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Determine content type from MIME type
  const getContentType = (mimeType: string): "video" | "audio" | "image" | "document" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  // Format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Content Header with Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Content ({contentCount})</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 h-auto"
        >
          {isExpanded ? (
            <>
              Hide <ChevronUp className="h-3 w-3 ml-1" />
            </>
          ) : (
            <>
              Show Content <ChevronDown className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  <span className="ml-2 text-sm text-zinc-400">Loading content...</span>
                </div>
              )}

              {error && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {!loading && !error && contentItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {contentItems.map((item) => (
                    <VideoCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {!loading && !error && contentItems.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-500">No content items found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
