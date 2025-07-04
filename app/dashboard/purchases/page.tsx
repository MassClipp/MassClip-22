"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Search, Package, Calendar, ExternalLink, Play } from "lucide-react"
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

export default function PurchasesPage() {
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
        return <Package className="h-8 w-8 text-white" />
      case "subscription":
        return <Calendar className="h-8 w-8 text-white" />
      default:
        return <Play className="h-8 w-8 text-white" />
    }
  }

  const getContentTypeFromTitle = (title: string) => {
    const lower = title.toLowerCase()
    if (lower.includes("video") || lower.includes("clip")) return "video"
    if (lower.includes("audio") || lower.includes("music")) return "audio"
    if (lower.includes("image") || lower.includes("photo")) return "image"
    return "bundle"
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="mb-8">
            <Skeleton className="h-12 w-64 mb-6 bg-zinc-800" />
            <div className="flex gap-8 mb-8">
              <Skeleton className="h-8 w-24 bg-zinc-800" />
              <Skeleton className="h-8 w-24 bg-zinc-800" />
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 p-6 bg-zinc-900 rounded-lg">
                <Skeleton className="h-16 w-16 rounded-lg bg-zinc-800" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2 bg-zinc-800" />
                  <Skeleton className="h-4 w-32 bg-zinc-800" />
                </div>
                <Skeleton className="h-10 w-24 bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-8">My Purchases</h1>

          {/* Tabs */}
          <div className="flex gap-8 mb-8">
            <button
              onClick={() => setActiveTab("downloads")}
              className={`text-xl font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "downloads"
                  ? "text-white border-white"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              Downloads
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`text-xl font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "orders"
                  ? "text-white border-white"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              Orders
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 h-5 w-5" />
            <Input
              placeholder="Search your purchases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-lg"
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {filteredPurchases.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-zinc-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {searchQuery
                    ? "No purchases match your search"
                    : activeTab === "downloads"
                      ? "No downloads yet"
                      : "No orders yet"}
                </h3>
                <p className="text-zinc-400 mb-6">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {filteredPurchases.map((purchase, index) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6">
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
                          <h3 className="text-xl font-semibold text-white mb-1 truncate">{purchase.title}</h3>
                          <p className="text-zinc-400 text-sm">{purchase.creatorUsername}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {purchase.status === "completed" && activeTab === "downloads" && (
                            <>
                              <Button
                                onClick={() => handleDownload(purchase)}
                                variant="outline"
                                className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-white"
                              >
                                Download
                              </Button>
                              <Button asChild className="bg-zinc-800 hover:bg-zinc-700 text-white">
                                <Link
                                  href={
                                    purchase.type === "bundle"
                                      ? `/bundles/${purchase.bundleId}`
                                      : `/product-box/${purchase.productBoxId}/content`
                                  }
                                >
                                  View bundle
                                </Link>
                              </Button>
                            </>
                          )}
                          {activeTab === "orders" && (
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={purchase.status === "completed" ? "default" : "secondary"}
                                className={
                                  purchase.status === "completed"
                                    ? "bg-green-600 text-white"
                                    : "bg-zinc-700 text-zinc-300"
                                }
                              >
                                {purchase.status}
                              </Badge>
                              <span className="text-lg font-semibold text-white">${purchase.price.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
