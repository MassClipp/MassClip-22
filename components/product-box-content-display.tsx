"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Download, File, Music, Loader2, Video, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
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

// Format file size
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
  const [isExpanded, setIsExpanded] = useState(true)
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

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

      // Get auth token for authenticated requests
      let authToken = null
      if (user) {
        try {
          authToken = await user.getIdToken(true)
        } catch (tokenError) {
          console.error("Error getting auth token:", tokenError)
        }
      }

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

      // If we still don't have items, try the API endpoint
      if (items.length === 0 && authToken) {
        try {
          const apiResponse = await fetch(`/api/product-box/${productBoxId}/content`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          })

          if (apiResponse.ok) {
            const apiData = await apiResponse.json()
            if (apiData.success && apiData.content && Array.isArray(apiData.content)) {
              apiData.content.forEach((item: any) => {
                items.push({
                  id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
                  title: item.title || item.filename || "Untitled",
                  fileUrl: item.fileUrl || item.publicUrl || item.downloadUrl || "",
                  thumbnailUrl: item.thumbnailUrl || "",
                  mimeType: item.mimeType || item.fileType || "application/octet-stream",
                  fileSize: item.fileSize || item.size || 0,
                  contentType: getContentType(item.mimeType || item.fileType || ""),
                  duration: item.duration || undefined,
                  filename:
                    item.filename || item.originalFileName || `file-${Math.random().toString(36).substring(2, 9)}`,
                  createdAt: item.createdAt || item.uploadedAt || new Date(),
                })
              })
            }
          }
        } catch (apiError) {
          console.error("Error fetching content from API:", apiError)
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

  // Video Card Component
  const VideoCard = ({ item }: { item: ContentItem }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [imageError, setImageError] = useState(false)

    // Handle download
    const handleDownload = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!item.fileUrl) {
        toast({
          title: "Download Error",
          description: "No download URL available",
          variant: "destructive",
        })
        return
      }

      const link = document.createElement("a")
      link.href = item.fileUrl
      link.download = item.filename || `${item.title}.${getFileExtension(item.mimeType)}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    // Get file extension from MIME type
    const getFileExtension = (mimeType: string): string => {
      const extensions: { [key: string]: string } = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "image/jpeg": "jpg",
        "image/png": "png",
        "application/pdf": "pdf",
      }
      return extensions[mimeType] || "file"
    }

    // Get content icon based on type
    const ContentIcon = () => {
      if (imageError) {
        if (item.contentType === "video") return <Video className="h-12 w-12 text-zinc-400" />
        if (item.contentType === "audio") return <Music className="h-12 w-12 text-zinc-400" />
        if (item.contentType === "image") return <ImageIcon className="h-12 w-12 text-zinc-400" />
        return <File className="h-12 w-12 text-zinc-400" />
      }
      return null
    }

    return (
      <div className="flex flex-col">
        <div
          className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Thumbnail or placeholder */}
          {!imageError ? (
            <img
              src={item.thumbnailUrl || `/placeholder.svg?height=480&width=270&text=${item.contentType}`}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <ContentIcon />
              <p className="text-xs text-zinc-500 mt-2">{item.contentType}</p>
            </div>
          )}

          {/* Content Type Badge */}
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className={`text-xs border-0 ${
                item.contentType === "video"
                  ? "bg-red-600/80 text-white"
                  : item.contentType === "audio"
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

          {/* Download button - only show on hover */}
          {isHovered && (
            <div className="absolute bottom-2 left-2 z-20">
              <button
                className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                onClick={handleDownload}
                aria-label="Download file"
                title="Download file"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Title below thumbnail */}
        <div className="mt-1 text-xs text-zinc-400 line-clamp-1" title={item.title}>
          {item.title || "Untitled"}
        </div>
      </div>
    )
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

              {error && !loading && contentItems.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {!loading && contentItems.length > 0 && (
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
