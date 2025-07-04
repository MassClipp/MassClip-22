"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, Calendar, Play } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import PurchasesFullScreen from "@/components/purchases-full-screen"
import { Suspense } from "react"

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

function PurchasesLoading() {
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

  return (
    <Suspense fallback={<PurchasesLoading />}>
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
    </Suspense>
  )
}
