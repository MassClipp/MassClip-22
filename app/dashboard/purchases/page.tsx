"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, AlertCircle, Package } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface Purchase {
  id: string
  productBoxId: string
  itemTitle: string
  itemDescription?: string
  amount: number
  currency: string
  purchasedAt: Date
  status: string
  thumbnailUrl?: string
  creatorUsername?: string
  creatorName?: string
  type: "product_box" | "bundle" | "subscription"
  sessionId?: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch purchases" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error fetching purchases:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load purchases"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async (purchase: Purchase) => {
    // Navigate to the product box content page
    window.location.href = `/product-box/${purchase.productBoxId}/content`
  }

  const getBundleThumbnail = (purchase: Purchase): string => {
    return purchase.thumbnailUrl || "/placeholder.svg?height=400&width=400&text=Bundle"
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchPurchases()
    } else if (!authLoading && !user) {
      setError("Please log in to view your purchases")
      setLoading(false)
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-8">My Purchases</h1>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            <span className="ml-3 text-zinc-400">Loading your purchases...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-8">My Purchases</h1>
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-zinc-400 mb-4">{error}</p>
            <Button
              onClick={fetchPurchases}
              variant="outline"
              size="sm"
              className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-8">My Purchases</h1>

        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Purchases Yet</h3>
            <p className="text-zinc-400">Start exploring premium content to build your collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {purchases.map((purchase, index) => (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all duration-300 group">
                  <div className="relative">
                    {/* Creator Username - Top Left */}
                    {purchase.creatorUsername && (
                      <div className="absolute top-3 left-3 z-10">
                        <Link
                          href={`/creator/${purchase.creatorUsername}`}
                          className="text-xs text-white/80 hover:text-white transition-colors bg-black/50 px-2 py-1 rounded backdrop-blur-sm"
                        >
                          @{purchase.creatorUsername}
                        </Link>
                      </div>
                    )}

                    {/* Bundle Thumbnail */}
                    <div className="aspect-square bg-zinc-800 overflow-hidden">
                      <img
                        src={getBundleThumbnail(purchase) || "/placeholder.svg"}
                        alt={purchase.itemTitle}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        style={{ objectFit: "cover" }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-zinc-800">
                                <div class="text-center">
                                  <div class="w-16 h-16 mx-auto mb-3 text-zinc-600">
                                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                                      <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                                      <path d="M2 17L12 22L22 17" />
                                      <path d="M2 12L12 17L22 12" />
                                    </svg>
                                  </div>
                                  <p class="text-xs text-zinc-500">Bundle</p>
                                </div>
                              </div>
                            `
                          }
                        }}
                      />
                    </div>
                  </div>

                  <CardContent className="p-4 bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-black/90 border-t border-zinc-800/50 backdrop-blur-sm">
                    <div className="space-y-3">
                      {/* Title */}
                      <div>
                        <h3 className="font-semibold text-white text-base mb-1 line-clamp-1 tracking-tight">
                          {purchase.itemTitle}
                        </h3>
                      </div>

                      {/* Open Button */}
                      <Button
                        onClick={() => handleOpen(purchase)}
                        className="w-full bg-white text-black hover:bg-gray-200 font-medium text-sm py-2"
                      >
                        Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
