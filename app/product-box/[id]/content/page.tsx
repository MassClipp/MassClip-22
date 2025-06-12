"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, RefreshCw, Download, Play, AlertCircle, FileVideo, Clock, Music, FileText, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

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

  const handlePlay = (item: UnifiedPurchaseItem) => {
    window.open(item.fileUrl, "_blank")
  }

  const handleDownload = async (item: UnifiedPurchaseItem) => {
    try {
      const link = document.createElement("a")
      link.href = item.fileUrl
      link.download = item.filename
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download started",
        description: `Downloading ${item.title}`,
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getFileTypeDisplay = (contentType: string) => {
    return contentType.toUpperCase()
  }

  const getFileIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <FileVideo className="w-12 h-12 text-zinc-500" />
      case "audio":
        return <Music className="w-12 h-12 text-zinc-500" />
      default:
        return <FileText className="w-12 h-12 text-zinc-500" />
    }
  }

  const generateThumbnail = (item: UnifiedPurchaseItem) => {
    if (item.thumbnailUrl) {
      return item.thumbnailUrl
    }
    return `/placeholder.svg?height=200&width=320&text=${encodeURIComponent(item.contentType.toUpperCase())}`
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
              <Button
                onClick={migrateThisProductBox}
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300"
              >
                Migrate This Purchase
              </Button>
              <Button onClick={runMigration} variant="outline" className="w-full border-zinc-700 text-zinc-300">
                Migrate All Purchases
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
        <div className="max-w-7xl mx-auto p-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/purchases")}
            className="text-white hover:bg-zinc-800 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{purchase.productBoxTitle}</h1>
              <p className="text-zinc-400 mt-1">{purchase.items.length} premium files unlocked</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={checkPurchase}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Bug className="mr-2 h-4 w-4" />
                Debug
              </Button>
              <Button
                variant="outline"
                onClick={fetchContent}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Grid */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {purchase.items.map((item) => (
            <Card
              key={item.id}
              className="bg-zinc-900/80 border-zinc-800 overflow-hidden group hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10"
            >
              <CardContent className="p-0">
                {/* Media Preview */}
                <div className="relative aspect-[9/16] bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden">
                  {item.contentType === "video" && item.fileUrl ? (
                    <div className="relative w-full h-full">
                      <video
                        src={item.fileUrl}
                        poster={generateThumbnail(item)}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        preload="metadata"
                        muted
                      />
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : item.contentType === "audio" ? (
                    <div className="relative w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Music className="w-16 h-16 text-purple-400 mx-auto mb-2" />
                          <p className="text-purple-300 text-sm font-medium">Audio File</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                      <div className="text-center">
                        {getFileIcon(item.contentType)}
                        <p className="text-zinc-500 text-sm mt-2">{getFileTypeDisplay(item.contentType)}</p>
                      </div>
                    </div>
                  )}

                  {/* File Type Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge
                      variant="secondary"
                      className={`border-0 backdrop-blur-sm ${
                        item.contentType === "video"
                          ? "bg-red-600/80 text-white"
                          : item.contentType === "audio"
                            ? "bg-purple-600/80 text-white"
                            : "bg-black/60 text-white"
                      }`}
                    >
                      {getFileTypeDisplay(item.contentType)}
                    </Badge>
                  </div>

                  {/* Duration Badge */}
                  {item.duration && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDuration(item.duration)}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content Info */}
                <div className="p-6">
                  {/* Title */}
                  <h3 className="font-bold text-white text-lg mb-3 line-clamp-2 leading-tight">{item.title}</h3>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-sm text-zinc-400 mb-6">
                    <span className="font-medium">{getFileTypeDisplay(item.contentType)}</span>
                    <span>{formatFileSize(item.fileSize)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handlePlay(item)}
                      className={`flex-1 font-medium transition-all duration-200 ${
                        item.contentType === "video"
                          ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                          : item.contentType === "audio"
                            ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                            : "bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-700 hover:to-zinc-800"
                      } text-white`}
                    >
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      {item.contentType === "audio" ? "Play" : "Open"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(item)}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all duration-200"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
