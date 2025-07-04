"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Package, Calendar, Play } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import PurchasesFullScreen from "@/components/purchases-full-screen"

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="w-full px-8 py-12">
          <div className="mb-12">
            <Skeleton className="h-12 w-64 mb-6 bg-zinc-800" />
            <div className="flex gap-8 mb-8">
              <Skeleton className="h-8 w-24 bg-zinc-800" />
              <Skeleton className="h-8 w-24 bg-zinc-800" />
            </div>
            <Skeleton className="h-12 w-full max-w-2xl bg-zinc-800" />
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 p-8 bg-zinc-900 rounded-lg">
                <Skeleton className="h-20 w-20 rounded-lg bg-zinc-800" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-3 bg-zinc-800" />
                  <Skeleton className="h-4 w-32 bg-zinc-800" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-24 bg-zinc-800" />
                  <Skeleton className="h-10 w-28 bg-zinc-800" />
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
      <div className="min-h-screen bg-black text-white">
        <div className="w-full px-8 py-12">
          <Alert variant="destructive" className="bg-red-900/20 border-red-800 max-w-2xl">
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
    <PurchasesFullScreen
      purchases={purchases}
      loading={loading}
      error={error}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      handleDownload={handleDownload}
      filteredPurchases={filteredPurchases}
      getContentIcon={getContentIcon}
    />
  )
}
