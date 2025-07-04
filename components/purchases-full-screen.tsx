"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Search, Package, Calendar, ExternalLink, Play, Download } from "lucide-react"
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
    [key: string]: any
  }
}

type TabType = "downloads" | "orders"

export default function PurchasesFullScreen() {
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
        thumbnailUrl: purchase.thumbnailUrl || "",
        metadata: {
          ...purchase.metadata,
          contentCount: purchase.metadata?.contentCount || 0,
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white pt-24">
        <div className="px-6">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-6 bg-zinc-800" />
            <div className="flex gap-8 mb-6">
              <Skeleton className="h-6 w-24 bg-zinc-800" />
              <Skeleton className="h-6 w-20 bg-zinc-800" />
            </div>
            <Skeleton className="h-12 w-full max-w-xl bg-zinc-800" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <Skeleton className="h-16 w-16 rounded-lg bg-zinc-800" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2 bg-zinc-800" />
                  <Skeleton className="h-4 w-32 bg-zinc-800" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20 bg-zinc-800" />
                  <Skeleton className="h-9 w-24 bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white pt-24">
        <div className="px-6">
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
    <div className="min-h-screen bg-black text-white pt-24">
      <div className="px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6">My Purchases</h1>

          {/* Tabs */}
          <div className="flex gap-8 mb-6">
            <button
              onClick={() => setActiveTab("downloads")}
              className={`text-lg font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "downloads"
                  ? "text-white border-white"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              Downloads
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`text-lg font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "orders"
                  ? "text-white border-white"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              Orders
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="relative flex items-center max-w-xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search your purchases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pb-8">
          <AnimatePresence mode="wait">
            {filteredPurchases.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-16"
              >
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 bg-zinc-900/50 rounded-full flex items-center justify-center border border-zinc-800">
                    <Package className="h-10 w-10 text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">
                    {searchQuery
                      ? "No purchases match your search"
                      : activeTab === "downloads"
                        ? "No downloads yet"
                        : "No orders yet"}
                  </h3>
                  <p className="text-zinc-400 mb-6 text-sm">
                    {searchQuery
                      ? "Try adjusting your search to find what you're looking for."
                      : "Start exploring premium content to build your collection."}
                  </p>
                  {!searchQuery && (
                    <Button asChild className="bg-red-600 hover:bg-red-700">
                      <Link href="/dashboard/explore">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Explore Content
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {filteredPurchases.map((purchase, index) => (
                  <motion.div
                    key={purchase.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 rounded-lg overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Icon/Thumbnail */}
                        <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {purchase.thumbnailUrl ? (
                            <img
                              src={purchase.thumbnailUrl || "/placeholder.svg"}
                              alt={purchase.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800">
                              {getContentIcon(purchase.type || "product_box")}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-1 truncate">{purchase.title}</h3>
                          <p className="text-zinc-400 text-sm">{purchase.creatorUsername}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {purchase.status === "completed" && activeTab === "downloads" && (
                            <>
                              <button
                                onClick={() => handleDownload(purchase)}
                                className="px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors text-white text-sm flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </button>
                              <Link
                                href={
                                  purchase.type === "bundle"
                                    ? `/bundles/${purchase.bundleId}`
                                    : `/product-box/${purchase.productBoxId}/content`
                                }
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white text-sm"
                              >
                                View bundle
                              </Link>
                            </>
                          )}
                          {activeTab === "orders" && (
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  purchase.status === "completed"
                                    ? "bg-green-600/20 text-green-400"
                                    : "bg-zinc-700/30 text-zinc-300"
                                }`}
                              >
                                {purchase.status}
                              </span>
                              <span className="text-lg font-semibold text-white">${purchase.price.toFixed(2)}</span>
                            </div>
                          )}
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
