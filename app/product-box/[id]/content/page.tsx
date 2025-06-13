"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, RefreshCw, Download, AlertCircle, Heart, Video, Music, ImageIcon, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface UnifiedPurchaseItem {
  id: string
  title: string
  fileUrl: string
  mimeType: string
  fileSize: number
  thumbnailUrl?: string
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string
}

interface UnifiedPurchase {
  id: string
  productBoxId: string
  productBoxTitle: string
  productBoxDescription?: string
  items: UnifiedPurchaseItem[]
}

export default function ProductBoxContentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [purchase, setPurchase] = useState<UnifiedPurchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  const fetchContent = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken(true)

      console.log("🔍 [Content Page] Fetching content for product box:", params.id)

      // First, try to get the unified purchase data
      const unifiedResponse = await fetch(`/api/user/unified-purchases?userId=${user.uid}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (unifiedResponse.ok) {
        const unifiedData = await unifiedResponse.json()
        const purchases = unifiedData.purchases || []

        console.log("📦 [Content Page] Found unified purchases:", purchases.length)

        // Find the purchase for this product box
        const foundPurchase = purchases.find((p: UnifiedPurchase) => p.productBoxId === params.id)

        if (foundPurchase && foundPurchase.items.length > 0) {
          console.log("✅ [Content Page] Found unified purchase with", foundPurchase.items.length, "items")
          setPurchase(foundPurchase)
          return
        }
      }

      // Fallback: Check legacy purchases and try to access content directly
      console.log("🔄 [Content Page] Unified purchase not found, checking legacy purchases...")

      const legacyResponse = await fetch(`/api/user/purchases`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json()
        const legacyPurchases = legacyData.purchases || []

        const legacyPurchase = legacyPurchases.find((p: any) => p.productBoxId === params.id)

        if (legacyPurchase) {
          console.log("✅ [Content Page] Found legacy purchase, trying to fetch content directly...")

          // Try to fetch content directly from the old API
          const contentResponse = await fetch(`/api/product-box/${params.id}/content`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          })

          if (contentResponse.ok) {
            const contentData = await contentResponse.json()

            if (contentData.success && contentData.content) {
              // Map content with proper URL fallback logic
              const mappedContent = contentData.content
                .map((item: any) => ({
                  id: item.id,
                  title: item.title || item.originalFileName || item.fileName || "Untitled",
                  filename: item.originalFileName || item.fileName || `${item.id}.mp4`,
                  fileUrl: item.fileUrl || item.publicUrl || item.downloadUrl,
                  thumbnailUrl: item.thumbnailUrl,
                  mimeType: item.fileType || item.mimeType || "application/octet-stream",
                  fileSize: item.fileSize || 0,
                  contentType: item.fileType?.startsWith("video/")
                    ? ("video" as const)
                    : item.fileType?.startsWith("audio/")
                      ? ("audio" as const)
                      : item.fileType?.startsWith("image/")
                        ? ("image" as const)
                        : ("document" as const),
                  duration: item.duration,
                }))
                .filter((item: UnifiedPurchaseItem) => item.fileUrl && item.fileUrl.startsWith("http"))

              setPurchase({
                id: legacyPurchase.sessionId || legacyPurchase.id,
                productBoxId: params.id,
                productBoxTitle: contentData.productBox?.title || legacyPurchase.itemTitle || "Premium Content",
                productBoxDescription: contentData.productBox?.description || "",
                items: mappedContent,
              })
              return
            }
          }
        }
      }

      // If we get here, no purchase was found
      setError("You don't have access to this content. Please purchase it first.")
    } catch (error) {
      console.error("❌ [Content Page] Error fetching content:", error)
      setError(error instanceof Error ? error.message : "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  const migrateThisProductBox = async () => {
    try {
      setLoading(true)
      const token = await user?.getIdToken(true)
      const response = await fetch("/api/migrate-product-box-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productBoxId: params.id,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Migration Complete",
          description: `Migrated purchase with ${result.contentItems} content items`,
        })
        // Refresh content after migration
        fetchContent()
      } else {
        toast({
          title: "Migration Failed",
          description: result.error || "Failed to migrate purchase",
          variant: "destructive",
        })
        setLoading(false)
      }
    } catch (error) {
      console.error("❌ [Migration] Error:", error)
      toast({
        title: "Migration Failed",
        description: "Failed to migrate purchase",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [user, params.id])

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Video Card Component
  const VideoCard = ({ item }: { item: UnifiedPurchaseItem }) => {
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

    // Toggle favorite
    const toggleFavorite = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsFavorite(!isFavorite)
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

          {/* Action buttons - only show on hover */}
          {isHovered && (
            <>
              {/* Download button */}
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

              {/* Favorite button */}
              <div className="absolute top-2 right-2 z-20">
                <button
                  className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
                    isFavorite ? "text-red-500" : "text-white"
                  }`}
                  onClick={toggleFavorite}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
                </button>
              </div>
            </>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading your premium content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-zinc-400 mb-6">{error}</p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/dashboard/purchases")}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                Return to Purchases
              </Button>
              <Button
                onClick={migrateThisProductBox}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300"
              >
                Migrate This Purchase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchase || !purchase.items.length) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Content Available</h2>
            <p className="text-zinc-400 mb-6">This product box doesn't contain any accessible content.</p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/dashboard/purchases")}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                Return to Purchases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push("/dashboard/purchases")}
            className="text-white hover:text-zinc-300 flex items-center gap-1 text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchases
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{purchase.productBoxTitle}</h1>
              <p className="text-zinc-400 text-sm">{purchase.items.length} premium files unlocked</p>
            </div>
            <div>
              <Button
                variant="outline"
                onClick={fetchContent}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9 px-3"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {purchase.items.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </div>

        {/* End Message */}
        <div className="text-center text-zinc-500 mt-16 pb-8">
          <p>You've unlocked all {purchase.items.length} premium files</p>
        </div>
      </main>
    </div>
  )
}
