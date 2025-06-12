"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Play, Download, Settings, Trash2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  coverImageUrl?: string
  isActive: boolean
  contentItems?: string[]
  createdAt?: any
}

interface EnhancedProductBoxDisplayProps {
  productBox: ProductBox
  onEdit?: (productBox: ProductBox) => void
  onDelete?: (productBoxId: string) => void
  onToggleActive?: (productBoxId: string, isActive: boolean) => void
  className?: string
}

export default function EnhancedProductBoxDisplay({
  productBox,
  onEdit,
  onDelete,
  onToggleActive,
  className = "",
}: EnhancedProductBoxDisplayProps) {
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showContent, setShowContent] = useState(true)
  const { toast } = useToast()

  // Fetch content items immediately when component mounts
  useEffect(() => {
    fetchContentItems()
  }, [productBox.id])

  const fetchContentItems = async () => {
    try {
      setLoading(true)

      console.log(`🔍 [Enhanced Display] Fetching content for product box: ${productBox.id}`)

      // Method 1: Try to fetch from productBoxContent collection first
      const contentQuery = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBox.id))
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
        console.log("🔄 [Enhanced Display] No productBoxContent found, trying contentItems fallback")

        const contentItemIds = productBox.contentItems || []

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
              console.error(`❌ [Enhanced Display] Error fetching upload ${uploadId}:`, uploadError)
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
      console.log(`✅ [Enhanced Display] Loaded ${items.length} content items`)
    } catch (err) {
      console.error("❌ [Enhanced Display] Error fetching content:", err)
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

  // Handle toggle active
  const handleToggleActive = async () => {
    if (onToggleActive) {
      await onToggleActive(productBox.id, !productBox.isActive)
    }
  }

  // Get the first video item for prominent display
  const firstVideoItem = contentItems.find((item) => item.contentType === "video")

  return (
    <Card className={`bg-zinc-900/50 border-zinc-800 overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-white">{productBox.title}</h3>
                <Badge variant={productBox.isActive ? "default" : "secondary"}>
                  {productBox.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-2">{productBox.description}</p>
              <p className="text-xl font-bold text-green-400">${productBox.price.toFixed(2)}</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={productBox.isActive} onCheckedChange={handleToggleActive} />
              <Button variant="ghost" size="icon" onClick={() => onEdit?.(productBox)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete?.(productBox.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Featured Video Content */}
        {firstVideoItem && (
          <div className="relative">
            <div className="aspect-video bg-black">
              <video
                src={firstVideoItem.fileUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster={firstVideoItem.thumbnailUrl}
                onError={(e) => {
                  console.error("Video error:", e)
                }}
              />
            </div>

            {/* Video overlay info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">{firstVideoItem.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-white/70 mt-1">
                    <Badge variant="secondary" className="bg-red-600/80 text-white border-0">
                      VIDEO
                    </Badge>
                    <span>{formatFileSize(firstVideoItem.fileSize)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(firstVideoItem.fileUrl, "_blank")}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Play
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const link = document.createElement("a")
                      link.href = firstVideoItem.fileUrl
                      link.download = firstVideoItem.filename
                      link.click()
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Summary */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">Content ({contentItems.length})</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContent(!showContent)}
              className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 h-auto"
            >
              {showContent ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show All
                </>
              )}
            </Button>
          </div>

          {/* Content Grid */}
          {showContent && contentItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {contentItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-video bg-zinc-800 rounded overflow-hidden group cursor-pointer"
                  onClick={() => window.open(item.fileUrl, "_blank")}
                >
                  {item.contentType === "video" ? (
                    <video
                      src={item.fileUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      muted
                      preload="metadata"
                      poster={item.thumbnailUrl}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-zinc-400 mb-1">
                          {item.contentType === "audio" ? "🎵" : item.contentType === "image" ? "🖼️" : "📄"}
                        </div>
                        <p className="text-xs text-zinc-500 truncate px-1">{item.title}</p>
                      </div>
                    </div>
                  )}

                  {/* Content type badge */}
                  <div className="absolute top-1 left-1">
                    <Badge
                      variant="secondary"
                      className={`text-xs border-0 ${
                        item.contentType === "video"
                          ? "bg-red-600/80 text-white"
                          : item.contentType === "audio"
                            ? "bg-purple-600/80 text-white"
                            : "bg-black/60 text-white"
                      }`}
                    >
                      {item.contentType.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))}

              {contentItems.length > 6 && (
                <div className="aspect-video bg-zinc-800/50 rounded flex items-center justify-center border-2 border-dashed border-zinc-700">
                  <div className="text-center">
                    <p className="text-xs text-zinc-500">+{contentItems.length - 6} more</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Add Content Button */}
          <div className="mt-4">
            <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              + Add Content
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
