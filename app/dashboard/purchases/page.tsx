"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, ShoppingBag, Eye, DollarSign, Package } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FullscreenWrapper } from "@/components/fullscreen-wrapper"
import Link from "next/link"
import Image from "next/image"

interface Purchase {
  id: string
  productBoxId: string
  title: string
  thumbnailUrl: string
  creatorUsername: string
  amount: number
  totalItems: number
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    loadPurchases()
  }, [user, authLoading, router])

  const loadPurchases = async () => {
    try {
      setLoading(true)
      setError(null)
      setPurchases([])

      if (!user) return

      const token = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setPurchases([])
          return
        }
        throw new Error(`Failed to load purchases: ${response.status}`)
      }

      const data = await response.json()

      let purchaseList: any[] = []
      if (data && data.purchases && Array.isArray(data.purchases)) {
        purchaseList = data.purchases
      }

      const validPurchases: Purchase[] = []

      for (const item of purchaseList) {
        if (item && typeof item === "object" && item.productBoxId) {
          validPurchases.push({
            id: String(item.id || Date.now()),
            productBoxId: String(item.productBoxId),
            title: String(item.bundleTitle || item.productBoxTitle || item.title || "Untitled"),
            thumbnailUrl: String(item.thumbnailUrl || item.productBoxThumbnail || ""),
            creatorUsername: String(item.creatorUsername || "Unknown"),
            amount: Number(item.amount) || 0,
            totalItems: Number(item.totalItems || item.contentCount) || 0,
          })
        }
      }

      setPurchases(validPurchases)
    } catch (err: any) {
      console.error("Error loading purchases:", err)
      setError(err.message || "Failed to load purchases")
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  const openContent = (purchase: Purchase) => {
    router.push(`/product-box/${purchase.productBoxId}/content`)
  }

  if (authLoading || loading) {
    return (
      <FullscreenWrapper className="bg-black">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full bg-gray-800" />
                <Skeleton className="h-4 w-20 bg-gray-800" />
                <Skeleton className="h-10 w-full bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </FullscreenWrapper>
    )
  }

  return (
    <FullscreenWrapper className="bg-black">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Purchases</h1>
          <Button
            onClick={loadPurchases}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent border-gray-700 text-white hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mb-8"></div>

        {error && (
          <Alert variant="destructive" className="max-w-md mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-400 text-lg mb-4">No purchases found</div>
            <div className="text-gray-500 text-sm mb-4">
              {error ? "There was an error loading your purchases." : "You haven't made any purchases yet."}
            </div>
            <Button onClick={loadPurchases} className="mb-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              {error ? "Try Again" : "Check Again"}
            </Button>
            {!error && (
              <div className="text-gray-500 text-sm">
                <Link href="/dashboard/explore" className="text-blue-400 hover:text-blue-300">
                  Browse creators
                </Link>{" "}
                to find premium content to purchase
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {purchases.map((purchase, index) => (
              <Card
                key={purchase.id}
                className="bg-gray-900/50 border-gray-800 overflow-hidden group hover:bg-gray-900/70 transition-all duration-300"
              >
                <div className="relative">
                  <div className="absolute top-3 left-3 z-10">
                    <Link
                      href={`/creator/${purchase.creatorUsername}`}
                      className="text-xs text-white/80 hover:text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm transition-colors"
                    >
                      {purchase.creatorUsername}
                    </Link>
                  </div>

                  <div className="aspect-square relative bg-gray-800">
                    {purchase.thumbnailUrl ? (
                      <Image
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="text-gray-500 h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>

                  <div className="p-4">
                    <h3 className="text-white text-sm font-medium mb-3 line-clamp-2 min-h-[2.5rem]">
                      {purchase.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <span className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />${purchase.amount.toFixed(2)}
                      </span>
                      {purchase.totalItems > 0 && (
                        <span className="flex items-center">
                          <Package className="h-3 w-3 mr-1" />
                          {purchase.totalItems} items
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => openContent(purchase)}
                      className="w-full bg-white text-black hover:bg-gray-100 font-medium"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FullscreenWrapper>
  )
}
