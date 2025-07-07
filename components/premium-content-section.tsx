"use client"

import { useState, useEffect } from "react"
import { Plus, ShoppingCart, Lock, Eye, EyeOff, Loader2, AlertCircle, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  currency: string
  coverImage?: string
  active: boolean
  contentItems: string[]
  createdAt?: any
  updatedAt?: any
  productId?: string
  priceId?: string
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
  const [showContent, setShowContent] = useState<{ [key: string]: boolean }>({})

  // Fetch product boxes for this creator
  const fetchProductBoxes = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [PremiumContent] Fetching product boxes for creator:", creatorId)

      const response = await fetch(`/api/creator/${creatorId}/product-boxes`)

      if (!response.ok) {
        throw new Error(`Failed to fetch product boxes: ${response.status}`)
      }

      const data = await response.json()
      const boxes = data.productBoxes || []

      console.log("📦 [PremiumContent] Raw product boxes data:", boxes)

      // Filter only active product boxes for non-owners
      const filteredBoxes = isOwner ? boxes : boxes.filter((box: ProductBox) => box.active)

      setProductBoxes(filteredBoxes)
      console.log(`✅ [PremiumContent] Loaded ${filteredBoxes.length} product boxes`)

      // Initialize show content state
      const initialShowState: { [key: string]: boolean } = {}
      filteredBoxes.forEach((box: ProductBox) => {
        initialShowState[box.id] = false // Hide content by default
      })
      setShowContent(initialShowState)
    } catch (err) {
      console.error("❌ [PremiumContent] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load premium content")
    } finally {
      setLoading(false)
    }
  }

  // Toggle content visibility
  const toggleContentVisibility = (productBoxId: string) => {
    setShowContent((prev) => ({ ...prev, [productBoxId]: !prev[productBoxId] }))
  }

  // Handle purchase
  const handlePurchase = async (productBoxId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase premium content",
        variant: "destructive",
      })
      return
    }

    try {
      const idToken = await user.getIdToken()
      const response = await fetch(`/api/creator/product-boxes/${productBoxId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (creatorId) {
      fetchProductBoxes()
    }
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

  if (productBoxes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Lock className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Premium Content Yet</h3>
          <p className="text-zinc-400 mb-6">
            {isOwner
              ? "Create premium content bundles to monetize your work and offer exclusive content to your audience."
              : `${creatorUsername} hasn't created any premium content bundles yet.`}
          </p>

          {isOwner && (
            <Button
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
              onClick={() => (window.location.href = "/dashboard/bundles")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mobile: Single column, Desktop: Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {productBoxes.map((productBox, index) => {
          const isContentVisible = showContent[productBox.id] || false

          return (
            <motion.div
              key={productBox.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="w-full"
            >
              <Card className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300">
                {/* Bundle Header */}
                <div className="relative">
                  {productBox.coverImage ? (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={productBox.coverImage || "/placeholder.svg"}
                        alt={productBox.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 text-sm">Premium Bundle</p>
                      </div>
                    </div>
                  )}

                  {/* Bundle count overlay */}
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-black/70 text-white border-0">
                      {productBox.contentItems.length} items
                    </Badge>
                  </div>

                  {/* Status badge for owners */}
                  {isOwner && (
                    <div className="absolute top-3 right-3">
                      <Badge variant={productBox.active ? "default" : "secondary"}>
                        {productBox.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-6">
                  {/* Bundle Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{productBox.title}</h3>
                    {productBox.description && (
                      <p className="text-zinc-400 text-sm line-clamp-3 mb-3">{productBox.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-400">${productBox.price.toFixed(2)} USD</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleContentVisibility(productBox.id)}
                        className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        {isContentVisible ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide Preview
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Show Preview
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <AnimatePresence>
                    {isContentVisible && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-4"
                      >
                        <div className="border-t border-zinc-800 pt-4">
                          <p className="text-xs text-zinc-500 mb-3">Bundle Preview</p>
                          <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: Math.min(productBox.contentItems.length, 4) }).map((_, i) => (
                              <div
                                key={i}
                                className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center"
                              >
                                <Lock className="h-4 w-4 text-zinc-600" />
                              </div>
                            ))}
                          </div>
                          {productBox.contentItems.length > 4 && (
                            <p className="text-xs text-zinc-500 mt-2">
                              +{productBox.contentItems.length - 4} more items
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Button */}
                  <div className="space-y-3">
                    {isOwner ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-zinc-700 hover:bg-zinc-800 bg-transparent"
                          onClick={() => (window.location.href = "/dashboard/bundles")}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                        onClick={() => handlePurchase(productBox.id)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase Bundle
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
