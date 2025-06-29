"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Play, Lock, ShoppingCart, Eye, Clock, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
  fileSize: number
  duration?: number
  contentType: "video" | "audio" | "image" | "document"
}

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  thumbnailUrl?: string
  creatorId: string
  creatorName: string
  creatorUsername: string
  content: ContentItem[]
  totalItems: number
}

export default function ProductBoxPreviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [productBox, setProductBox] = useState<ProductBox | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewItems, setPreviewItems] = useState<ContentItem[]>([])
  const [lockedItems, setLockedItems] = useState<ContentItem[]>([])

  useEffect(() => {
    fetchProductBoxPreview()
  }, [params.id])

  const fetchProductBoxPreview = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/product-box/${params.id}/preview`, {
        headers: {
          "Content-Type": "application/json",
          ...(user && { Authorization: `Bearer ${await user.getIdToken()}` }),
        },
      })

      if (!response.ok) {
        throw new Error("Failed to load preview")
      }

      const data = await response.json()

      if (data.success) {
        setProductBox(data.productBox)

        // Calculate 1/4 of content for preview (minimum 1, maximum based on total)
        const totalContent = data.productBox.content || []
        const previewCount = Math.max(1, Math.floor(totalContent.length / 4))

        // Split content into preview and locked
        const preview = totalContent.slice(0, previewCount)
        const locked = totalContent.slice(previewCount)

        setPreviewItems(preview)
        setLockedItems(locked)
      } else {
        setError(data.error || "Failed to load preview")
      }
    } catch (error) {
      console.error("Error fetching preview:", error)
      setError("Failed to load preview")
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/product-boxes/${params.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        toast({
          title: "Purchase Failed",
          description: data.error || "Failed to create checkout session",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast({
        title: "Purchase Failed",
        description: "Failed to initiate purchase",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Preview Video Card Component
  const PreviewVideoCard = ({ item, isLocked = false }: { item: ContentItem; isLocked?: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false)

    return (
      <div className="relative">
        <div
          className={`aspect-[9/16] rounded-lg overflow-hidden bg-zinc-900 group relative ${isLocked ? "opacity-50" : ""}`}
        >
          {item.contentType === "video" && !isLocked ? (
            <video
              className="w-full h-full object-cover"
              poster={item.thumbnailUrl}
              controls={!isLocked}
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              <source src={item.fileUrl} type="video/mp4" />
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl || "/placeholder.svg"}
                  alt={item.title}
                  className={`w-full h-full object-cover ${isLocked ? "blur-md" : ""}`}
                />
              ) : (
                <div className="text-zinc-400">
                  {item.contentType === "video" && <Play className="h-8 w-8" />}
                  {item.contentType === "audio" && <FileText className="h-8 w-8" />}
                  {item.contentType === "image" && <Eye className="h-8 w-8" />}
                </div>
              )}
            </div>
          )}

          {/* Locked overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <Lock className="h-6 w-6 text-white mx-auto mb-2" />
                <p className="text-white text-sm font-medium">Locked</p>
              </div>
            </div>
          )}

          {/* Preview badge for unlocked items */}
          {!isLocked && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-green-600 text-white">
                Preview
              </Badge>
            </div>
          )}
        </div>

        {/* File info */}
        <div className="mt-2 space-y-1">
          <p className="text-sm font-medium text-white truncate">{item.title}</p>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{item.contentType}</span>
            <span>{formatFileSize(item.fileSize)}</span>
          </div>
          {item.duration && (
            <div className="flex items-center text-xs text-zinc-400">
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(item.duration)}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (error || !productBox) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <p className="text-red-400 mb-4">{error || "Preview not available"}</p>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
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
            onClick={() => router.back()}
            className="text-white hover:text-zinc-300 flex items-center gap-2 text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                {productBox.thumbnailUrl && (
                  <img
                    src={productBox.thumbnailUrl || "/placeholder.svg"}
                    alt={productBox.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold mb-2">{productBox.title}</h1>
                  <p className="text-zinc-400 text-sm mb-2">by @{productBox.creatorUsername}</p>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span>{productBox.totalItems} items</span>
                    <span>${productBox.price}</span>
                  </div>
                </div>
              </div>

              {productBox.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-zinc-300 leading-relaxed">{productBox.description}</p>
                </div>
              )}
            </div>

            <div className="ml-6">
              <Button onClick={handlePurchase} className="bg-white text-black hover:bg-zinc-200 px-6 py-3">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase ${productBox.price}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Preview */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Preview Section */}
        {previewItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-green-400" />
              <h2 className="text-xl font-semibold">Free Preview</h2>
              <Badge variant="secondary" className="bg-green-600 text-white">
                {previewItems.length} of {productBox.totalItems} items
              </Badge>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
              {previewItems.map((item) => (
                <PreviewVideoCard key={item.id} item={item} isLocked={false} />
              ))}
            </div>
          </div>
        )}

        {/* Locked Content Section */}
        {lockedItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-zinc-400" />
              <h2 className="text-xl font-semibold">Locked Content</h2>
              <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                {lockedItems.length} items
              </Badge>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {lockedItems.map((item) => (
                <PreviewVideoCard key={item.id} item={item} isLocked={true} />
              ))}
            </div>
          </div>
        )}

        {/* Purchase CTA */}
        <div className="text-center py-12 border-t border-zinc-800">
          <h3 className="text-2xl font-bold mb-4">Unlock All Content</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Get access to all {productBox.totalItems} premium files and support @{productBox.creatorUsername}
          </p>
          <Button onClick={handlePurchase} size="lg" className="bg-white text-black hover:bg-zinc-200 px-8 py-3">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Purchase for ${productBox.price}
          </Button>
        </div>
      </main>
    </div>
  )
}
