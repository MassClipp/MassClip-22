"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface ProductBoxContentDisplay916Props {
  productBoxId: string
  contentCount: number
  className?: string
  onAddContent?: () => void
}

export default function ProductBoxContentDisplay916({
  productBoxId,
  contentCount,
  className = "",
  onAddContent,
}: ProductBoxContentDisplay916Props) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isExpanded) {
      fetchContentItems()
    }
  }, [productBoxId, isExpanded])

  const fetchContentItems = async () => {
    if (contentItems.length > 0) return

    try {
      setLoading(true)
      setError(null)

      const contentQuery = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBoxId))
      const contentSnapshot = await getDocs(contentQuery)

      const items: ContentItem[] = []

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

      setContentItems(items)
    } catch (err) {
      console.error("Error fetching content:", err)
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

  const getContentType = (mimeType: string): "video" | "audio" | "image" | "document" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  const handleContentClick = (item: ContentItem) => {
    window.open(item.fileUrl, "_blank")
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
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

      {/* Content Grid */}
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
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  <span className="ml-2 text-sm text-zinc-400">Loading content...</span>
                </div>
              )}

              {error && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {!loading && !error && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                    onClick={onAddContent}
                  >
                    <Plus className="w-8 h-8 text-zinc-500 mb-2" />
                    <p className="text-xs text-zinc-500 text-center px-2">Add Content</p>
                  </div>
                </div>
              )}

              {!loading && !error && contentItems.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📹</div>
                  <p className="text-sm text-zinc-500">No content items found</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={onAddContent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Content
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
