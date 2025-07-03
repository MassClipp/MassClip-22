"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, Plus, ShoppingCart, Loader2, AlertCircle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  currency?: string
  coverImageUrl?: string
  active: boolean
  contentItems?: string[]
  createdAt?: any
  updatedAt?: any
}

interface PremiumContentSectionProps {
  creatorId: string
  creatorUsername: string
  isOwner: boolean
}

export default function PremiumContentSection({ creatorId, creatorUsername, isOwner }: PremiumContentSectionProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null)

  // Fetch product boxes for this creator
  const fetchProductBoxes = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Premium Content] Fetching product boxes for creator:", creatorId)

      // Use the updated API endpoint
      const response = await fetch(`/api/creator/${creatorId}/product-boxes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch product boxes: ${response.status}`)
      }

      const data = await response.json()
      console.log("📦 [Premium Content] Product boxes response:", data)

      const boxes = data.productBoxes || []

      // Filter for active bundles only and sort by creation date
      const activeBoxes = boxes
        .filter((box: ProductBox) => box.active === true)
        .sort((a: ProductBox, b: ProductBox) => {
          const aTime = a.createdAt?.seconds || 0
          const bTime = b.createdAt?.seconds || 0
          return bTime - aTime
        })

      setProductBoxes(activeBoxes)
      console.log(`✅ [Premium Content] Loaded ${activeBoxes.length} active product boxes`)
    } catch (err) {
      console.error("❌ [Premium Content] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load premium content")
    } finally {
      setLoading(false)
    }
  }

  // Handle purchase
  const handlePurchase = async (productBoxId: string) => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to purchase premium content",
        variant: "destructive",
      })
      return
    }

    try {
      setPurchaseLoading(productBoxId)
      console.log("🛒 [Premium Content] Starting purchase for:", productBoxId)

      const idToken = await user.getIdToken()

      const response = await fetch(`/api/creator/product-boxes/${productBoxId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()

      if (data.checkoutUrl) {
        console.log("✅ [Premium Content] Redirecting to checkout:", data.checkoutUrl)
        window.location.href = data.checkoutUrl
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("❌ [Premium Content] Purchase error:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setPurchaseLoading(null)
    }
  }

  // Format price
  const formatPrice = (price: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price)
  }

  useEffect(() => {
    fetchProductBoxes()
  }, [creatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading premium content...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Failed to Load Premium Content</h3>
        <p className="text-zinc-400 mb-4">{error}</p>
        <Button
          onClick={fetchProductBoxes}
          variant="outline"
          className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div>
      {productBoxes.length === 0 ? (
        <div className="py-16 text-center">
          <div className="max-w-md mx-auto bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <Package className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Premium Content</h3>
            <p className="text-zinc-400 mb-6">
              {isOwner
                ? "Create premium content bundles to monetize your work and provide exclusive value to your audience."
                : `${creatorUsername} hasn't created any premium content bundles yet.`}
            </p>

            {isOwner && (
              <Button
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                onClick={() => window.open("/dashboard/bundles", "_blank")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Bundle
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {productBoxes.map((productBox, index) => (
              <motion.div
                key={productBox.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="bg-zinc-900/60 backdrop-blur-sm border-zinc-800/50 overflow-hidden hover:border-zinc-700/50 transition-all duration-300 group">
                  <CardContent className="p-0">
                    {/* Cover Image or Placeholder */}
                    <div className="relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden">
                      {productBox.coverImageUrl ? (
                        <img
                          src={productBox.coverImageUrl || "/placeholder.svg"}
                          alt={productBox.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-zinc-600 group-hover:text-zinc-500 transition-colors" />
                        </div>
                      )}

                      {/* Preview Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-white/90">
                          <Play className="h-5 w-5" />
                          <span className="text-sm font-medium">Preview Bundle</span>
                        </div>
                      </div>

                      {/* Content Count Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-black/60 text-white border-0">
                          {productBox.contentItems?.length || 0} items
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{productBox.title}</h3>
                        {productBox.description && (
                          <p className="text-sm text-zinc-400 line-clamp-2">{productBox.description}</p>
                        )}
                      </div>

                      {/* Price and Purchase */}
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-green-400">
                          {formatPrice(productBox.price, productBox.currency)}
                        </div>

                        {isOwner ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                            onClick={() => window.open(`/dashboard/bundles`, "_blank")}
                          >
                            Manage
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                            onClick={() => handlePurchase(productBox.id)}
                            disabled={purchaseLoading === productBox.id}
                          >
                            {purchaseLoading === productBox.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Purchase
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
