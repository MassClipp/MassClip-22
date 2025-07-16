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

  const getContentIcon = (type: string) => {
    switch (type) {
      case "bundle":
        return <Package className="h-6 w-6 text-white" />
      case "subscription":
        return <Calendar className="h-6 w-6 text-white" />
      default:
        return <Play className="h-6 w-6 text-white" />
    }
  }

  const getThumbnailUrl = (purchase: Purchase) => {
    // Priority order for thumbnail sources
    return (
      purchase.thumbnailUrl ||
      purchase.metadata?.thumbnailUrl ||
      (purchase.type === "bundle" ? `/api/bundles/${purchase.bundleId}/thumbnail` : null) ||
      (purchase.productBoxId ? `/api/product-box/${purchase.productBoxId}/thumbnail` : null)
    )
  }

  if (authLoading || loading) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white ${className}`}>
        <div className="w-full h-full overflow-y-auto">
          <div className="w-full px-6 py-8">
            <div className="mb-8">
              <Skeleton className="h-12 w-64 mb-6 bg-gray-800/50" />
              <div className="flex gap-8 mb-8">
                <Skeleton className="h-8 w-24 bg-gray-800/50" />
                <Skeleton className="h-8 w-24 bg-gray-800/50" />
              </div>
            </div>
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-0 bg-gray-800/20 border-b border-gray-700/30">
                  <Skeleton className="h-24 w-24 bg-gray-700/50 rounded-none" />
                  <div className="flex-1 px-6 py-6">
                    <Skeleton className="h-6 w-48 mb-2 bg-gray-700/50" />
                    <Skeleton className="h-4 w-32 bg-gray-700/50" />
                  </div>
                  <div className="px-6">
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
      <div className={`w-full h-full bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white ${className}`}>
        <div className="w-full h-full overflow-y-auto px-6 py-8">
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
    <div className={`w-full h-full bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white ${className}`}>
      <div className="w-full h-full overflow-y-auto">
        {/* Header Section - Full Width */}
        <div className="w-full px-6 py-8 border-b border-gray-700/30 bg-gradient-to-r from-black/80 via-gray-900/80 to-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-4xl font-bold mb-8 text-white">My Purchases</h1>

          {/* Tabs - Full Width */}
          <div className="flex gap-8 mb-8 border-b border-gray-700/50">
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

          {/* Search - Full Width */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search your purchases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-gray-800/30 border-gray-600 text-white placeholder:text-gray-400 h-14 text-lg rounded-xl focus:border-gray-500 focus:ring-1 focus:ring-gray-500 w-full"
            />
          </div>
        </div>

        {/* Content Section - Full Width, No Padding */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {filteredPurchases.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-center h-96 px-6"
              >
                <div className="max-w-md mx-auto text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border border-gray-700 shadow-lg">
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
                    <Button asChild className="bg-red-600 hover:bg-red-700 h-12 px-8 text-lg shadow-lg">
                      <Link href="/dashboard/explore">
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Explore Content
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                {filteredPurchases.map((purchase, index) => (
                  <motion.div
                    key={purchase.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="w-full"
                  >
                    <div className="bg-gray-800/20 border-0 border-b border-gray-700/20 hover:bg-gray-800/30 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center w-full">
                        {/* Thumbnail - No padding, edge-to-edge */}
                        <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                          {getThumbnailUrl(purchase) ? (
                            <img
                              src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                              alt={purchase.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to clean gradient placeholder if image fails to load
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                const parent = target.parentElement
                                if (parent) {
                                  const placeholderDiv = document.createElement("div")
                                  placeholderDiv.className =
                                    "w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 relative"

                                  // Add subtle pattern overlay
                                  const patternDiv = document.createElement("div")
                                  patternDiv.className =
                                    "absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"
                                  placeholderDiv.appendChild(patternDiv)

                                  // Add icon container
                                  const iconContainer = document.createElement("div")
                                  iconContainer.className =
                                    "relative z-10 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg"
                                  iconContainer.innerHTML = `<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
                                  placeholderDiv.appendChild(iconContainer)

                                  parent.appendChild(placeholderDiv)
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 relative">
                              {/* Subtle radial gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
                              <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-gray-900/20"></div>

                              {/* Icon container with gradient */}
                              <div className="relative z-10 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                                {getContentIcon(purchase.type || "product_box")}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content - Proper spacing only for text content */}
                        <div className="flex-1 min-w-0 px-6 py-6">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-semibold text-white mb-1 truncate">{purchase.title}</h3>
                              <p className="text-gray-400 text-sm mb-1">{purchase.creatorUsername}</p>
                              {purchase.metadata?.contentCount !== undefined && (
                                <p className="text-gray-500 text-xs">
                                  {purchase.metadata.contentCount} item
                                  {purchase.metadata.contentCount !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 flex-shrink-0 ml-6">
                              {purchase.status === "completed" && activeTab === "downloads" && (
                                <>
                                  <Button
                                    onClick={() => handleDownload(purchase)}
                                    variant="outline"
                                    className="border-gray-600 hover:bg-gray-700 bg-transparent text-white h-10 px-4 hover:border-gray-500 transition-all duration-200"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                  <Button
                                    asChild
                                    className="bg-gray-700 hover:bg-gray-600 text-white h-10 px-4 shadow-lg hover:shadow-xl transition-all duration-200"
                                  >
                                    <Link
                                      href={
                                        purchase.type === "bundle"
                                          ? `/bundles/${purchase.bundleId}`
                                          : `/product-box/${purchase.productBoxId}/content`
                                      }
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View bundle
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
                                        ? "bg-green-600 text-white px-3 py-1 shadow-sm"
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
                        </div>
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
