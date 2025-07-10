"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, MoreVertical, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import Image from "next/image"

interface Purchase {
  id: string
  productBoxId: string
  bundleTitle: string
  thumbnailUrl?: string
  creatorUsername: string
  creatorId: string
  purchaseDate: string
  amount: number
  currency: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingPurchase, setRemovingPurchase] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    fetchPurchases()
  }, [user, authLoading, router])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Purchases Page] Fetching purchases for user: ${user?.uid}`)

      const token = await user.getIdToken()

      // Try multiple endpoints to find purchases
      const endpoints = ["/api/user/unified-purchases", "/api/user/purchases", "/api/debug/user-purchases"]

      let allPurchases: Purchase[] = []

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 [Purchases Page] Trying endpoint: ${endpoint}`)

          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`✅ [Purchases Page] Response from ${endpoint}:`, data)

            // Handle different response formats
            let purchases = []
            if (Array.isArray(data)) {
              purchases = data
            } else if (data.purchases && Array.isArray(data.purchases)) {
              purchases = data.purchases
            } else if (data.data && Array.isArray(data.data)) {
              purchases = data.data
            }

            // Transform purchases to consistent format
            const transformedPurchases = purchases.map((purchase: any) => ({
              id:
                purchase.id ||
                purchase.sessionId ||
                purchase.purchaseId ||
                purchase.productBoxId ||
                Math.random().toString(),
              productBoxId: purchase.productBoxId || purchase.bundleId || purchase.itemId,
              bundleTitle: purchase.bundleTitle || purchase.productBoxTitle || purchase.title || "Untitled Bundle",
              thumbnailUrl: purchase.thumbnailUrl || purchase.productBoxThumbnail || purchase.previewImage,
              creatorUsername: purchase.creatorUsername || purchase.creator?.username || "Unknown",
              creatorId: purchase.creatorId || purchase.creator?.id || "",
              purchaseDate:
                purchase.purchaseDate || purchase.purchasedAt || purchase.createdAt || new Date().toISOString(),
              amount: purchase.amount || 0,
              currency: purchase.currency || "usd",
            }))

            allPurchases = [...allPurchases, ...transformedPurchases]
            console.log(`✅ [Purchases Page] Found ${transformedPurchases.length} purchases from ${endpoint}`)
          }
        } catch (endpointError) {
          console.warn(`⚠️ [Purchases Page] Error with ${endpoint}:`, endpointError)
        }
      }

      // Remove duplicates based on productBoxId
      const uniquePurchases = allPurchases.filter(
        (purchase, index, self) => index === self.findIndex((p) => p.productBoxId === purchase.productBoxId),
      )

      console.log(`✅ [Purchases Page] Total unique purchases found: ${uniquePurchases.length}`)
      setPurchases(uniquePurchases)
    } catch (error: any) {
      console.error("❌ [Purchases Page] Error fetching purchases:", error)
      setError(error.message || "Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContent = (purchase: Purchase) => {
    console.log(`🔗 [Purchases Page] Opening content for:`, purchase)
    router.push(`/product-box/${purchase.productBoxId}/content`)
  }

  const handleRemovePurchase = async (purchase: Purchase) => {
    try {
      console.log(`🗑️ [Purchases Page] Removing purchase:`, purchase)
      setRemovingPurchase(purchase.id)

      const token = await user.getIdToken()

      // Try removing by different IDs
      const idsToTry = [purchase.id, purchase.productBoxId, `${purchase.productBoxId}_${user.uid}`].filter(Boolean)

      let removed = false

      for (const idToTry of idsToTry) {
        try {
          const response = await fetch(`/api/user/purchases/${idToTry}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            console.log(`✅ [Purchases Page] Successfully removed purchase with ID: ${idToTry}`)
            removed = true
            break
          } else {
            const errorData = await response.json()
            console.warn(`⚠️ [Purchases Page] Failed to remove with ID ${idToTry}:`, errorData)
          }
        } catch (apiError) {
          console.warn(`⚠️ [Purchases Page] API error for ID ${idToTry}:`, apiError)
        }
      }

      if (removed) {
        // Remove from local state
        setPurchases((prev) => prev.filter((p) => p.id !== purchase.id))
        console.log(`✅ [Purchases Page] Purchase removed successfully`)
      } else {
        // If API removal failed, still remove from local state as fallback
        setPurchases((prev) => prev.filter((p) => p.id !== purchase.id))
        console.log(`⚠️ [Purchases Page] API removal failed, removed from local state only`)
      }
    } catch (error) {
      console.error(`❌ [Purchases Page] Error removing purchase:`, error)
      // Still remove from local state as fallback
      setPurchases((prev) => prev.filter((p) => p.id !== purchase.id))
    } finally {
      setRemovingPurchase(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full bg-gray-800" />
                <Skeleton className="h-4 w-20 bg-gray-800" />
                <Skeleton className="h-10 w-full bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Purchases</h1>
          <Button
            onClick={fetchPurchases}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent border-gray-700 text-white hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Border Line */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mb-8"></div>

        {error && (
          <Alert variant="destructive" className="max-w-md mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">No purchases found</div>
            <div className="text-gray-500 text-sm mb-4">If you just made a purchase, try refreshing the page</div>
            <Button onClick={fetchPurchases} className="mb-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
            <div className="text-gray-500 text-sm">Browse creators to find premium content to purchase</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {purchases.map((purchase, index) => (
              <Card
                key={purchase.id}
                className="bg-gray-900/50 border-gray-800 overflow-hidden group hover:bg-gray-900/70 transition-all duration-300 relative"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: "fadeInUp 0.6s ease-out forwards",
                }}
              >
                <div className="relative">
                  {/* Creator Username - Top Left */}
                  <div className="absolute top-3 left-3 z-10">
                    <Link
                      href={`/creator/${purchase.creatorUsername}`}
                      className="text-xs text-white/80 hover:text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm transition-colors"
                    >
                      {purchase.creatorUsername}
                    </Link>
                  </div>

                  {/* Three Dots Menu - Top Right */}
                  <div className="absolute top-3 right-3 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-sm"
                          disabled={removingPurchase === purchase.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                        <DropdownMenuItem
                          onClick={() => handleRemovePurchase(purchase)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                          disabled={removingPurchase === purchase.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {removingPurchase === purchase.id ? "Removing..." : "Remove"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Thumbnail - 1:1 Aspect Ratio */}
                  <div className="aspect-square relative bg-gray-800">
                    {purchase.thumbnailUrl ? (
                      <Image
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.bundleTitle}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        onError={(e) => {
                          console.warn(`⚠️ [Purchases Page] Image failed to load:`, purchase.thumbnailUrl)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-500 text-4xl">📦</div>
                      </div>
                    )}
                  </div>

                  {/* Border Line */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Bundle Title */}
                    <h3 className="text-white text-sm font-medium mb-3 line-clamp-2 min-h-[2.5rem]">
                      {purchase.bundleTitle}
                    </h3>

                    <Button
                      onClick={() => handleOpenContent(purchase)}
                      className="w-full bg-white text-black hover:bg-gray-100 font-medium"
                      disabled={removingPurchase === purchase.id}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
