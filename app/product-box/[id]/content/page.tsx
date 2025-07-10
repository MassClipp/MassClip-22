"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, RefreshCw } from "lucide-react"
import Image from "next/image"

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  mimeType: string
  fileSize: number
  thumbnailUrl?: string
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string
  displayTitle: string
  displaySize: string
}

interface BundleData {
  title: string
  description?: string
  thumbnail?: string
  creatorUsername: string
  totalItems: number
}

export default function ProductBoxContentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bundleData, setBundleData] = useState<BundleData | null>(null)
  const [items, setItems] = useState<ContentItem[]>([])

  const productBoxId = params.id as string

  useEffect(() => {
    if (!user || !productBoxId) {
      setLoading(false)
      setError("Missing user or product box ID")
      return
    }

    checkAccessAndFetchContent()
  }, [user, productBoxId])

  const checkAccessAndFetchContent = async () => {
    if (!user || !productBoxId) return

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Content Page] Checking access for bundle: ${productBoxId}`)

      const idToken = await user.getIdToken()

      // Check if user has access via purchases
      const purchasesResponse = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json()
        const purchases = Array.isArray(purchasesData) ? purchasesData : purchasesData.purchases || []

        const matchingPurchase = purchases.find(
          (purchase: any) =>
            purchase.productBoxId?.toLowerCase() === productBoxId.toLowerCase() ||
            purchase.bundleId?.toLowerCase() === productBoxId.toLowerCase(),
        )

        if (matchingPurchase) {
          console.log(`✅ [Content Page] Access granted via purchase`)

          // Fetch bundle details
          const bundleResponse = await fetch(`/api/bundles/${productBoxId}`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          })

          let bundleInfo: BundleData = {
            title: matchingPurchase.bundleTitle || "Untitled Bundle",
            description: "",
            thumbnail: matchingPurchase.thumbnailUrl,
            creatorUsername: matchingPurchase.creatorUsername || "Unknown",
            totalItems: 0,
          }

          if (bundleResponse.ok) {
            const bundleData = await bundleResponse.json()
            bundleInfo = {
              title: bundleData.title || bundleInfo.title,
              description: bundleData.description,
              thumbnail: bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || bundleInfo.thumbnail,
              creatorUsername: bundleData.creatorUsername || bundleInfo.creatorUsername,
              totalItems: bundleData.totalItems || 0,
            }
          }

          // Fetch content items
          const contentResponse = await fetch(`/api/product-box/${productBoxId}/content`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          })

          let contentItems: ContentItem[] = []
          if (contentResponse.ok) {
            const contentData = await contentResponse.json()
            contentItems = Array.isArray(contentData) ? contentData : contentData.items || []
          }

          setBundleData(bundleInfo)
          setItems(contentItems)
          setHasAccess(true)
        } else {
          console.log(`❌ [Content Page] No matching purchase found`)
          setError("You don't have access to this content")
          setHasAccess(false)
        }
      } else {
        console.error(`❌ [Content Page] Failed to check purchases`)
        setError("Failed to verify access")
        setHasAccess(false)
      }
    } catch (error: any) {
      console.error(`❌ [Content Page] Error:`, error)
      setError(error.message || "Failed to load content")
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (item: ContentItem) => {
    try {
      console.log(`📥 [Download] Starting download for: ${item.title}`)

      // Create download link
      const link = document.createElement("a")
      link.href = item.fileUrl
      link.download = item.filename || item.title
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log(`✅ [Download] Download initiated for: ${item.title}`)
    } catch (error) {
      console.error(`❌ [Download] Error downloading ${item.title}:`, error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading content...</div>
        </div>
      </div>
    )
  }

  if (!hasAccess || error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h2 className="text-white text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">{error || "You don't have access to this content"}</p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/dashboard/purchases")}
              className="w-full bg-white text-black hover:bg-gray-100"
            >
              Back to Purchases
            </Button>
            <Button
              onClick={checkAccessAndFetchContent}
              variant="outline"
              className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => router.push("/dashboard/purchases")}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          <Button
            onClick={checkAccessAndFetchContent}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-800 ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold text-white mb-2">{bundleData?.title}</h1>
          <p className="text-gray-400 text-lg">
            {items.length} premium file{items.length !== 1 ? "s" : ""} unlocked
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-6">
        {items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden hover:bg-gray-900/70 transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square relative bg-gray-800">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl || "/placeholder.svg"}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-500 text-4xl">
                          {item.contentType === "video" ? "🎥" : item.contentType === "audio" ? "🎵" : "📄"}
                        </div>
                      </div>
                    )}

                    {/* Download Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button
                        onClick={() => handleDownload(item)}
                        size="sm"
                        className="bg-white text-black hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-4">
                    <div className="text-white text-sm font-medium mb-1 truncate">{item.contentType}</div>
                    <div className="text-gray-400 text-xs">{formatFileSize(item.fileSize)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg">
                You've unlocked all {items.length} premium file{items.length !== 1 ? "s" : ""}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 text-6xl mb-4">📦</div>
            <h3 className="text-white text-xl font-semibold mb-2">No Content Available</h3>
            <p className="text-gray-400 mb-6">This bundle doesn't contain any content items yet.</p>
            <Button
              onClick={() => router.push("/dashboard/purchases")}
              className="bg-white text-black hover:bg-gray-100"
            >
              Back to Purchases
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
