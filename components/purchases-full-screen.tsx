"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Search, Package, Calendar, ExternalLink, Play, Download, Eye } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface Purchase {
  id: string
  title?: string
  description?: string
  price: number
  currency: string
  status: string
  createdAt: any
  updatedAt: any
  productBoxId?: string
  bundleId?: string
  creatorId?: string
  creatorUsername?: string
  type?: "product_box" | "bundle" | "subscription"
  downloadUrl?: string
  thumbnailUrl?: string
  metadata?: {
    title?: string
    description?: string
    contentCount?: number
    thumbnailUrl?: string
    contentType?: string
    fileUrl?: string
    [key: string]: any
  }
}

type TabType = "downloads" | "orders"

interface PurchasesFullScreenProps {
  className?: string
}

export default function PurchasesFullScreen({ className = "" }: PurchasesFullScreenProps) {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("downloads")

  useEffect(() => {
    if (user) {
      fetchPurchases()
    }
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.status}`)
      }

      const data = await response.json()

      // Ensure all purchases have required fields with fallbacks
      const normalizedPurchases = (data.purchases || []).map((purchase: any) => ({
        id: purchase.id || "",
        title: purchase.title || purchase.metadata?.title || "Untitled Purchase",
        description: purchase.description || purchase.metadata?.description || "",
        price: purchase.price || 0,
        currency: purchase.currency || "usd",
        status: purchase.status || "completed",
        createdAt: purchase.createdAt || new Date(),
        updatedAt: purchase.updatedAt || new Date(),
        productBoxId: purchase.productBoxId || null,
        bundleId: purchase.bundleId || null,
        creatorId: purchase.creatorId || "",
        creatorUsername: purchase.creatorUsername || "Unknown Creator",
        type: purchase.type || "product_box",
        downloadUrl: purchase.downloadUrl || "",
        thumbnailUrl: purchase.thumbnailUrl || purchase.metadata?.thumbnailUrl || "",
        metadata: {
          ...purchase.metadata,
          contentCount: purchase.metadata?.contentCount || 0,
          thumbnailUrl: purchase.metadata?.thumbnailUrl || purchase.thumbnailUrl || "",
        },
      }))

      setPurchases(normalizedPurchases)
    } catch (err) {
      console.error("Error fetching purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (purchase: Purchase) => {
    try {
      const token = await user.getIdToken()
      const endpoint =
        purchase.type === "bundle"
          ? `/api/bundles/${purchase.bundleId}/download`
          : `/api/product-box/${purchase.productBoxId}/direct-content`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download content")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${purchase.title || "content"}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: `${purchase.title} is being downloaded.`,
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Failed to download the content. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      searchQuery === "" ||
      (purchase.title && purchase.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (purchase.description && purchase.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (purchase.creatorUsername && purchase.creatorUsername.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTab = activeTab === "downloads" ? purchase.status === "completed" : true

    return matchesSearch && matchesTab
  })

  const detectContentType = (purchase: Purchase): "video" | "image" | "audio" | "bundle" => {
    // If it's a bundle type, return bundle
    if (purchase.type === "bundle") {
      return "bundle"
    }

    // Check metadata for content type
    if (purchase.metadata?.contentType) {
      if (purchase.metadata.contentType.startsWith("video/")) return "video"
      if (purchase.metadata.contentType.startsWith("image/")) return "image"
      if (purchase.metadata.contentType.startsWith("audio/")) return "audio"
    }

    // Check file URLs for extensions
    const fileUrl = purchase.metadata?.fileUrl || purchase.downloadUrl || purchase.thumbnailUrl || ""
    const extension = fileUrl.split(".").pop()?.toLowerCase()

    // Video extensions
    if (["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(extension || "")) {
      return "video"
    }

    // Audio extensions
    if (["mp3", "wav", "flac", "aac", "m4a", "ogg", "wma"].includes(extension || "")) {
      return "audio"
    }

    // Image extensions
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension || "")) {
      return "image"
    }

    // Default to video for unknown types (since most content appears to be video)
    return "video"
  }

  const getContentIcon = (purchase: Purchase) => {
    const contentType = detectContentType(purchase)

    switch (contentType) {
      case "bundle":
        return <Package className="h-6 w-6 text-white" />
      case "video":
        return <Play className="h-6 w-6 text-white" />
      case "audio":
        return <Calendar className="h-6 w-6 text-white" />
      case "image":
        return <Eye className="h-6 w-6 text-white" />
      default:
        return <Play className="h-6 w-6 text-white" />
    }
  }

  const getThumbnailUrl = (purchase: Purchase) => {
    const contentType = detectContentType(purchase)

    // For video content, prioritize actual thumbnail URLs over file URLs
    if (contentType === "video") {
      const thumbnailUrl =
        purchase.thumbnailUrl ||
        purchase.metadata?.thumbnailUrl ||
        (purchase.type === "bundle" ? `/api/bundles/${purchase.bundleId}/thumbnail` : null) ||
        (purchase.productBoxId ? `/api/product-box/${purchase.productBoxId}/thumbnail` : null)

      if (thumbnailUrl) {
        // Always use proxy for external URLs
        if (thumbnailUrl.startsWith("http://") || thumbnailUrl.startsWith("https://")) {
          return `/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}`
        }
        // For API endpoints, also use proxy
        if (thumbnailUrl.startsWith("/api/") && !thumbnailUrl.includes("placeholder.svg")) {
          const fullUrl = `${window.location.origin}${thumbnailUrl}`
          return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`
        }
        return thumbnailUrl
      }

      // If no thumbnail available for video, return null to show video icon
      return null
    }

    // For other content types, use the standard logic
    const rawUrl =
      purchase.thumbnailUrl ||
      purchase.metadata?.thumbnailUrl ||
      purchase.metadata?.fileUrl ||
      (purchase.type === "bundle" ? `/api/bundles/${purchase.bundleId}/thumbnail` : null) ||
      (purchase.productBoxId ? `/api/product-box/${purchase.productBoxId}/thumbnail` : null)

    if (rawUrl) {
      // Always use proxy for external URLs
      if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        return `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`
      }
      // For API endpoints that might have CORS issues, also use proxy
      if (rawUrl.startsWith("/api/") && !rawUrl.includes("placeholder.svg")) {
        const fullUrl = `${window.location.origin}${rawUrl}`
        return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`
      }
    }

    return rawUrl
  }

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen bg-black text-white ${className}`}>
        <div className="w-full h-full">
          <div className="px-6 py-8">
            <div className="mb-8">
              <Skeleton className="h-12 w-64 mb-6 bg-gray-800/50" />
              <div className="flex gap-8 mb-8">
                <Skeleton className="h-8 w-24 bg-gray-800/50" />
                <Skeleton className="h-8 w-24 bg-gray-800/50" />
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-lg">
                  <Skeleton className="h-16 w-16 bg-gray-700/50 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-48 mb-2 bg-gray-700/50" />
                    <Skeleton className="h-4 w-32 bg-gray-700/50" />
                  </div>
                  <div>
                    <Skeleton className="h-10 w-24 bg-gray-700/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-black text-white ${className}`}>
        <div className="px-6 py-8">
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchPurchases} className="mt-4 bg-red-600 hover:bg-red-700" variant="default">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-black text-white ${className}`}>
      <div className="w-full">
        {/* Header Section */}
        <div className="px-6 py-8 border-b border-gray-800/50">
          <h1 className="text-4xl font-bold mb-8 text-white">My Purchases</h1>

          {/* Tabs */}
          <div className="flex gap-8 mb-8 border-b border-gray-800/50">
            <button
              onClick={() => setActiveTab("downloads")}
              className={`text-xl font-medium pb-4 border-b-2 transition-all duration-200 ${
                activeTab === "downloads"
                  ? "text-white border-white"
                  : "text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-500"
              }`}
            >
              Downloads
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`text-xl font-medium pb-4 border-b-2 transition-all duration-200 ${
                activeTab === "orders"
                  ? "text-white border-white"
                  : "text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-500"
              }`}
            >
              Orders
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search your purchases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-400 h-14 text-lg rounded-xl focus:border-gray-500 focus:ring-1 focus:ring-gray-500 w-full"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            {filteredPurchases.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-center h-96"
              >
                <div className="max-w-md mx-auto text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-900 rounded-full flex items-center justify-center border border-gray-700">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    {searchQuery
                      ? "No purchases match your search"
                      : activeTab === "downloads"
                        ? "No downloads yet"
                        : "No orders yet"}
                  </h3>
                  <p className="text-gray-400 mb-8 text-lg">
                    {searchQuery
                      ? "Try adjusting your search to find what you're looking for."
                      : "Start exploring premium content to build your collection."}
                  </p>
                  {!searchQuery && (
                    <Button asChild className="bg-red-600 hover:bg-red-700 h-12 px-8 text-lg">
                      <Link href="/dashboard/explore">
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Explore Content
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {filteredPurchases.map((purchase, index) => (
                  <motion.div
                    key={purchase.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {getThumbnailUrl(purchase) ? (
                          <img
                            src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                            alt={purchase.title}
                            className="w-full h-full object-cover rounded-lg"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onLoad={() => {
                              console.log("[v0] Image loaded successfully:", getThumbnailUrl(purchase))
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              console.log("[v0] Image failed to load:", target.src)
                              target.style.display = "none"
                              const parent = target.parentElement
                              if (parent) {
                                const contentType = detectContentType(purchase)
                                const iconSvg =
                                  contentType === "video"
                                    ? `<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
                                    : contentType === "audio"
                                      ? `<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>`
                                      : `<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`

                                parent.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                                    <div class="text-center">
                                      ${iconSvg}
                                      <div class="text-xs text-gray-400 mt-1">${contentType}</div>
                                    </div>
                                  </div>
                                `
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                            {getContentIcon(purchase)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white mb-1 truncate">{purchase.title}</h3>
                        <p className="text-gray-400 text-sm mb-1">{purchase.creatorUsername}</p>
                        {purchase.metadata?.contentCount !== undefined && (
                          <p className="text-gray-500 text-xs">
                            {purchase.metadata.contentCount} item{purchase.metadata.contentCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {purchase.status === "completed" && activeTab === "downloads" && (
                          <>
                            <Button
                              onClick={() => handleDownload(purchase)}
                              variant="outline"
                              className="border-gray-600 hover:bg-gray-700 bg-transparent text-white h-10 px-4"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button asChild className="bg-gray-700 hover:bg-gray-600 text-white h-10 px-4">
                              <Link
                                href={
                                  purchase.type === "bundle"
                                    ? `/bundles/${purchase.bundleId}/content`
                                    : `/product-box/${purchase.productBoxId}/content`
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Content
                              </Link>
                            </Button>
                          </>
                        )}
                        {activeTab === "orders" && (
                          <div className="flex items-center gap-4">
                            <Badge
                              variant={purchase.status === "completed" ? "default" : "secondary"}
                              className={
                                purchase.status === "completed"
                                  ? "bg-green-600 text-white px-3 py-1"
                                  : "bg-gray-700 text-gray-300 px-3 py-1"
                              }
                            >
                              {purchase.status}
                            </Badge>
                            <span className="text-xl font-semibold text-white">${purchase.price.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
