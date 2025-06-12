"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Play, Download, File, ImageIcon, Music, Video, Loader2 } from "lucide-react"
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

export default function ProductBoxContentDisplay({
  productBoxId,
  contentCount,
  className = "",
}: ProductBoxContentDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true) // Changed from false to true
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

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Get content type icon
  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  // Handle expand/collapse
  const handleToggle = () => {
    setIsExpanded(!isExpanded)
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

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Content Header with Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Content ({contentCount})</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
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
            <div className="pt-2 space-y-2">
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
                <div className="space-y-2">
                  {contentItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30 hover:border-zinc-600/50 transition-colors group"
                    >
                      {/* Thumbnail or Icon */}
                      <div className="w-12 h-12 bg-zinc-700 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.contentType === "video" && item.fileUrl ? (
                          <video
                            src={item.fileUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            onError={(e) => {
                              console.error("Video error:", e)
                              // Fallback to icon if video fails
                              const target = e.target as HTMLVideoElement
                              target.style.display = "none"
                              target.nextElementSibling?.classList.remove("hidden")
                            }}
                          />
                        ) : (
                          <div className={`${item.contentType === "video" ? "hidden" : ""} text-zinc-400`}>
                            {getContentIcon(item.contentType)}
                          </div>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                          <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">
                            {item.contentType}
                          </Badge>
                          {item.fileSize > 0 && <span>{formatFileSize(item.fileSize)}</span>}
                          {item.duration && <span>{formatDuration(item.duration)}</span>}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 h-auto hover:bg-zinc-700"
                      >
                        {item.contentType === "video" || item.contentType === "audio" ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
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
