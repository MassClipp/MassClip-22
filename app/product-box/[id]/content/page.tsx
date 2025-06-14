"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, RefreshCw, Download, AlertCircle, Bug, Heart, Play, Music, File, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

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
      const productBoxId = params.id.trim().toLowerCase()

      console.log("🔍 [Content Page] Fetching content for product box:", productBoxId)

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
        console.log(
          "📦 [Content Page] Purchase data sample:",
          purchases.map((p) => ({
            id: p.id,
            productBoxId: p.productBoxId,
            itemId: p.itemId,
            sessionId: p.sessionId,
          })),
        )

        // Find the purchase using multiple possible field names
        const foundPurchase = purchases.find((p: any) => {
          const purchaseProductBoxId = (p.productBoxId || "").trim().toLowerCase()
          const purchaseItemId = (p.itemId || "").trim().toLowerCase()
          const purchaseId = (p.id || "").trim().toLowerCase()

          return purchaseProductBoxId === productBoxId || purchaseItemId === productBoxId || purchaseId === productBoxId
        })

        if (foundPurchase && foundPurchase.items && foundPurchase.items.length > 0) {
          console.log("✅ [Content Page] Found unified purchase with", foundPurchase.items.length, "items")
          setPurchase(foundPurchase)
          return
        } else if (foundPurchase) {
          console.log("⚠️ [Content Page] Found unified purchase but no content items:", foundPurchase)
        } else {
          console.warn("❌ [Content Page] No matching purchase found in unified purchases", {
            productBoxId,
            availablePurchases: purchases.map((p) => ({
              productBoxId: p.productBoxId,
              itemId: p.itemId,
              id: p.id,
            })),
          })
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

        console.log("📦 [Content Page] Found legacy purchases:", legacyPurchases.length)
        console.log(
          "📦 [Content Page] Legacy purchase data sample:",
          legacyPurchases.map((p) => ({
            id: p.id,
            productBoxId: p.productBoxId,
            itemId: p.itemId,
            sessionId: p.sessionId,
          })),
        )

        // Find legacy purchase using multiple possible field names
        const legacyPurchase = legacyPurchases.find((p: any) => {
          const purchaseProductBoxId = (p.productBoxId || "").trim().toLowerCase()
          const purchaseItemId = (p.itemId || "").trim().toLowerCase()
          const purchaseId = (p.id || "").trim().toLowerCase()

          return purchaseProductBoxId === productBoxId || purchaseItemId === productBoxId || purchaseId === productBoxId
        })

        // If we found a legacy purchase, automatically migrate it
        if (legacyPurchase) {
          console.log("✅ [Content Page] Found legacy purchase, attempting automatic migration...")

          try {
            // Attempt automatic migration
            const migrationResponse = await fetch("/api/migrate-product-box-purchase", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                productBoxId: params.id, // Use original ID, not normalized
              }),
            })

            if (migrationResponse.ok) {
              const migrationResult = await migrationResponse.json()
              if (migrationResult.success) {
                console.log("✅ [Content Page] Automatic migration successful, retrying content fetch...")

                // Retry fetching unified purchases after successful migration
                const retryUnifiedResponse = await fetch(`/api/user/unified-purchases?userId=${user.uid}`, {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                })

                if (retryUnifiedResponse.ok) {
                  const retryUnifiedData = await retryUnifiedResponse.json()
                  const retryPurchases = retryUnifiedData.purchases || []
                  const retryFoundPurchase = retryPurchases.find((p: any) => {
                    const purchaseProductBoxId = (p.productBoxId || "").trim().toLowerCase()
                    const purchaseItemId = (p.itemId || "").trim().toLowerCase()
                    const purchaseId = (p.id || "").trim().toLowerCase()

                    return (
                      purchaseProductBoxId === productBoxId ||
                      purchaseItemId === productBoxId ||
                      purchaseId === productBoxId
                    )
                  })

                  if (retryFoundPurchase && retryFoundPurchase.items && retryFoundPurchase.items.length > 0) {
                    console.log(
                      "✅ [Content Page] Successfully loaded migrated purchase with",
                      retryFoundPurchase.items.length,
                      "items",
                    )
                    setPurchase(retryFoundPurchase)
                    return
                  }
                }
              }
            }
          } catch (migrationError) {
            console.warn("⚠️ [Content Page] Automatic migration failed, falling back to legacy content:", migrationError)
          }
        } else {
          console.warn("❌ [Content Page] No matching purchase found in legacy purchases", {
            productBoxId,
            availablePurchases: legacyPurchases.map((p) => ({
              productBoxId: p.productBoxId,
              itemId: p.itemId,
              id: p.id,
            })),
          })
        }

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
      console.error("❌ [Content Page] ACCESS DENIED - No valid purchase found for product box:", productBoxId)
      setError("You don't have access to this content. Please purchase it first.")
    } catch (error) {
      console.error("❌ [Content Page] Error fetching content:", error)
      setError(error instanceof Error ? error.message : "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  const runMigration = async () => {
    try {
      setLoading(true)
      const token = await user?.getIdToken(true)
      const response = await fetch("/api/migrate-to-unified-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Migration Complete",
          description: `Migrated ${result.results.migrated} purchases`,
        })
        // Refresh content after migration
        fetchContent()
      } else {
        toast({
          title: "Migration Failed",
          description: result.error || "Failed to migrate purchases",
          variant: "destructive",
        })
        setLoading(false)
      }
    } catch (error) {
      console.error("❌ [Migration] Error:", error)
      toast({
        title: "Migration Failed",
        description: "Failed to migrate purchases",
        variant: "destructive",
      })
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

  const checkPurchase = async () => {
    try {
      setLoading(true)
      const token = await user?.getIdToken(true)
      const response = await fetch(`/api/debug/check-product-box-purchase?productBoxId=${params.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      setDebugInfo(result)
      setShowDebug(true)
      setLoading(false)
    } catch (error) {
      console.error("❌ [Debug] Error:", error)
      toast({
        title: "Debug Failed",
        description: "Failed to check purchase status",
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

  // Video Card Component - Direct Video Player
  const VideoCard = ({ item }: { item: UnifiedPurchaseItem }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
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
        // Pause all other videos first
        document.querySelectorAll("video").forEach((v) => {
          if (v !== videoRef.current) {
            v.pause()
          }
        })

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

    // Handle download
    const handleDownload = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!item.fileUrl) return

      const link = document.createElement("a")
      link.href = item.fileUrl
      link.download = item.filename || `${item.title}.mp4`
      link.click()
    }

    // Toggle favorite
    const toggleFavorite = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsFavorite(!isFavorite)
    }

    return (
      <div className="flex flex-col">
        <div
          className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Direct Video Player - No Thumbnails */}
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

              {/* Border that appears on hover */}
              <div className="absolute inset-0 border border-white/0 group-hover:border-white/40 rounded-lg transition-all duration-200"></div>

              {/* Play/Pause Button Overlay - Only visible on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
                </button>
              </div>
            </>
          ) : item.contentType === "audio" ? (
            <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
              <Music className="h-8 w-8 text-purple-400" />
            </div>
          ) : item.contentType === "image" ? (
            <img src={item.fileUrl || item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <File className="h-8 w-8 text-zinc-400" />
            </div>
          )}

          {/* Action buttons - only visible on hover */}
          <div className="absolute bottom-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
              onClick={handleDownload}
              aria-label="Download"
              title="Download"
            >
              <Download className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          <div className="absolute bottom-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
        </div>

        {/* File info below video */}
        <div className="mt-1 flex justify-between items-center">
          <span className="text-xs text-zinc-400">video</span>
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

  if (showDebug && debugInfo) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <Button variant="outline" onClick={() => setShowDebug(false)} className="mb-4">
          Back to Content
        </Button>
        <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
        <div className="bg-zinc-900 p-4 rounded-lg mb-4">
          <h2 className="text-xl font-semibold mb-2">Purchase Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800 p-3 rounded">
              <span className="text-zinc-400">Product Box ID:</span>
              <div className="font-mono text-sm mt-1">{debugInfo.productBoxId}</div>
            </div>
            <div className="bg-zinc-800 p-3 rounded">
              <span className="text-zinc-400">Product Box Exists:</span>
              <div className="font-mono text-sm mt-1">{debugInfo.productBoxExists ? "Yes ✅" : "No ❌"}</div>
            </div>
            <div className="bg-zinc-800 p-3 rounded">
              <span className="text-zinc-400">Has Unified Purchase:</span>
              <div className="font-mono text-sm mt-1">{debugInfo.hasUnifiedPurchase ? "Yes ✅" : "No ❌"}</div>
            </div>
            <div className="bg-zinc-800 p-3 rounded">
              <span className="text-zinc-400">Has Legacy Purchase:</span>
              <div className="font-mono text-sm mt-1">{debugInfo.hasLegacyPurchase ? "Yes ✅" : "No ❌"}</div>
            </div>
            <div className="bg-zinc-800 p-3 rounded">
              <span className="text-zinc-400">Content Items Count:</span>
              <div className="font-mono text-sm mt-1">{debugInfo.contentItemsCount}</div>
            </div>
          </div>
        </div>

        {debugInfo.hasLegacyPurchase && !debugInfo.hasUnifiedPurchase && (
          <div className="mb-6">
            <Button onClick={migrateThisProductBox} className="bg-green-600 hover:bg-green-700">
              Migrate This Purchase
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {debugInfo.unifiedPurchases.length > 0 && (
            <div className="bg-zinc-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Unified Purchases</h2>
              <pre className="bg-black p-3 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(debugInfo.unifiedPurchases, null, 2)}
              </pre>
            </div>
          )}

          {debugInfo.legacyPurchases.length > 0 && (
            <div className="bg-zinc-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Legacy Purchases</h2>
              <pre className="bg-black p-3 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(debugInfo.legacyPurchases, null, 2)}
              </pre>
            </div>
          )}

          {debugInfo.productBox && (
            <div className="bg-zinc-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Product Box</h2>
              <pre className="bg-black p-3 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(debugInfo.productBox, null, 2)}
              </pre>
            </div>
          )}

          {debugInfo.contentItems && debugInfo.contentItems.length > 0 && (
            <div className="bg-zinc-900 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Content Items (First 5)</h2>
              <pre className="bg-black p-3 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(debugInfo.contentItems, null, 2)}
              </pre>
            </div>
          )}
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
              <Button onClick={fetchContent} variant="outline" className="w-full border-zinc-700 text-zinc-300">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Access
              </Button>
              <Button onClick={checkPurchase} variant="outline" className="w-full border-zinc-700 text-zinc-300">
                <Bug className="mr-2 h-4 w-4" />
                Debug Purchase
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
              <Button onClick={checkPurchase} variant="outline" className="w-full border-zinc-700 text-zinc-300">
                <Bug className="mr-2 h-4 w-4" />
                Debug Purchase
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
