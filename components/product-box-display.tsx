"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Settings, Trash2, Eye, EyeOff, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { VideoThumbnail916 } from "./video-thumbnail-916"
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

interface ProductBoxDisplayProps {
  productBox: ProductBox
  onEdit?: (productBox: ProductBox) => void
  onDelete?: (productBoxId: string) => void
  onToggleActive?: (productBoxId: string, isActive: boolean) => void
  onAddContent?: (productBoxId: string) => void
  className?: string
}

export default function ProductBoxDisplay({
  productBox,
  onEdit,
  onDelete,
  onToggleActive,
  onAddContent,
  className = "",
}: ProductBoxDisplayProps) {
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

      console.log(`🔍 [Product Box Display] Fetching content for product box: ${productBox.id}`)

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
        console.log("🔄 [Product Box Display] No productBoxContent found, trying contentItems fallback")

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
              console.error(`❌ [Product Box Display] Error fetching upload ${uploadId}:`, uploadError)
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
      console.log(`✅ [Product Box Display] Loaded ${items.length} content items`)
    } catch (err) {
      console.error("❌ [Product Box Display] Error fetching content:", err)
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

  // Handle toggle active
  const handleToggleActive = async () => {
    if (onToggleActive) {
      await onToggleActive(productBox.id, !productBox.isActive)
    }
  }

  // Handle content item click
  const handleContentClick = (item: ContentItem) => {
    window.open(item.fileUrl, "_blank")
  }

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

        {/* Content Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
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
                  Show
                </>
              )}
            </Button>
          </div>

          {/* Content Grid - 9:16 Thumbnails */}
          {showContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4"
            >
              {contentItems.map((item) => (
                <VideoThumbnail916
                  key={item.id}
                  title={item.title}
                  videoUrl={item.fileUrl}
                  thumbnailUrl={item.thumbnailUrl}
                  fileSize={item.fileSize}
                  duration={item.duration}
                  contentType={item.contentType}
                  onClick={() => handleContentClick(item)}
                />
              ))}

              {/* Add Content Placeholder */}
              <div
                className="aspect-[9/16] bg-zinc-800/50 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200"
                onClick={() => onAddContent?.(productBox.id)}
              >
                <Plus className="w-8 h-8 text-zinc-500 mb-2" />
                <p className="text-xs text-zinc-500 text-center px-2">Add Content</p>
              </div>
            </motion.div>
          )}

          {/* Add Content Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => onAddContent?.(productBox.id)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
