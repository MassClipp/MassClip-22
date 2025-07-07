"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface Purchase {
  id: string
  title?: string
  price: number
  currency: string
  status: string
  createdAt: any
  productBoxId?: string
  bundleId?: string
  creatorId?: string
  creatorUsername?: string
  type?: "product_box" | "bundle" | "subscription"
  thumbnailUrl?: string
  metadata?: {
    title?: string
    thumbnailUrl?: string
    [key: string]: any
  }
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setPurchases(data.purchases || [])
    } catch (err) {
      console.error("Error fetching purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async (purchase: Purchase) => {
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
        throw new Error("Failed to access content")
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
        description: "Failed to access the content. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getThumbnailUrl = (purchase: Purchase) => {
    return (
      purchase.thumbnailUrl ||
      purchase.metadata?.thumbnailUrl ||
      (purchase.type === "bundle" ? `/api/bundles/${purchase.bundleId}/thumbnail` : null) ||
      (purchase.productBoxId ? `/api/product-box/${purchase.productBoxId}/thumbnail` : null) ||
      "/placeholder.svg?height=200&width=200&text=No+Image"
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-8">My Purchases</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full bg-gray-800" />
                <Skeleton className="h-4 w-16 bg-gray-800" />
                <Skeleton className="h-8 w-full bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Purchases</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-8">My Purchases</h1>

        {purchases.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-3">No purchases yet</h3>
            <p className="text-gray-400 mb-8">Start exploring premium content to build your collection.</p>
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <Link href="/dashboard/explore">Explore Content</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="space-y-3">
                {/* Creator Username - Top Left, Clickable */}
                {purchase.creatorUsername && (
                  <Link
                    href={`/creator/${purchase.creatorUsername}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors block"
                  >
                    @{purchase.creatorUsername}
                  </Link>
                )}

                {/* Thumbnail */}
                <div className="aspect-square w-full bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                    alt={purchase.title || "Purchase"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=200&width=200&text=No+Image"
                    }}
                  />
                </div>

                {/* Open Button */}
                <Button
                  onClick={() => handleOpen(purchase)}
                  className="w-full bg-white text-black hover:bg-gray-200 font-medium"
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
