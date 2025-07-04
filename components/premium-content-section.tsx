"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Package, Loader2, AlertCircle, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface Bundle {
  id: string
  title: string
  description: string
  price: number
  currency: string
  coverImage?: string
  customPreviewThumbnail?: string
  coverImageUrl?: string
  active: boolean
  contentItems: string[]
  createdAt?: any
  updatedAt?: any
  productId?: string
  priceId?: string
}

interface PremiumContentSectionProps {
  creatorId: string
  creatorUsername?: string
  isOwner?: boolean
}

export default function PremiumContentSection({
  creatorId,
  creatorUsername,
  isOwner = false,
}: PremiumContentSectionProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null)
  const router = useRouter()

  // Fetch creator's bundles
  const fetchCreatorBundles = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Premium Content] Fetching bundles for creator: ${creatorId}`)

      const response = await fetch(`/api/creator/${creatorId}/product-boxes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setBundles([])
          return
        }
        throw new Error(`Failed to fetch bundles: ${response.status}`)
      }

      const data = await response.json()
      const creatorBundles = data.productBoxes || data.bundles || []

      // Filter only active bundles and convert to Bundle format
      const activeBundles = creatorBundles
        .filter((bundle: any) => bundle.active !== false)
        .map((bundle: any) => ({
          id: bundle.id,
          title: bundle.title,
          description: bundle.description || "",
          price: bundle.price || 0,
          currency: bundle.currency || "usd",
          coverImage: bundle.coverImage,
          customPreviewThumbnail: bundle.customPreviewThumbnail,
          coverImageUrl: bundle.coverImageUrl,
          active: bundle.active !== false,
          contentItems: bundle.contentItems || [],
          createdAt: bundle.createdAt,
          updatedAt: bundle.updatedAt,
          productId: bundle.productId,
          priceId: bundle.priceId,
        }))

      setBundles(activeBundles)
      console.log(`✅ [Premium Content] Loaded ${activeBundles.length} active bundles`)
    } catch (err) {
      console.error("❌ [Premium Content] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load premium content")
    } finally {
      setLoading(false)
    }
  }

  // Handle bundle purchase
  const handlePurchase = async (bundle: Bundle) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase this bundle",
        variant: "destructive",
      })
      return
    }

    try {
      setPurchaseLoading(bundle.id)

      const idToken = await user.getIdToken()
      const response = await fetch(`/api/creator/product-boxes/${bundle.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create checkout session")
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
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

  // Get the best available thumbnail with priority order
  const getBundleThumbnail = (bundle: Bundle): string => {
    // Priority: customPreviewThumbnail > coverImage > coverImageUrl > placeholder
    const thumbnail = bundle.customPreviewThumbnail || bundle.coverImage || bundle.coverImageUrl

    if (thumbnail && thumbnail.startsWith("http")) {
      return thumbnail
    }

    return "/placeholder.svg?height=400&width=400&text=Bundle"
  }

  useEffect(() => {
    if (creatorId) {
      fetchCreatorBundles()
    }
  }, [creatorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading premium content...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-zinc-400 mb-4">{error}</p>
        <Button
          onClick={fetchCreatorBundles}
          variant="outline"
          size="sm"
          className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (bundles.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Premium Content</h3>
        <p className="text-zinc-400">This creator hasn't published any premium bundles yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {bundles.map((bundle, index) => (
          <motion.div
            key={bundle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all duration-300 group">
              <div className="relative">
                {/* Bundle Thumbnail - Changed to square aspect ratio */}
                <div className="aspect-square bg-zinc-800 overflow-hidden">
                  <img
                    src={getBundleThumbnail(bundle) || "/placeholder.svg"}
                    alt={bundle.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    style={{ objectFit: "cover" }}
                    onError={(e) => {
                      // Fallback to package icon if image fails to load
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

                {/* Content Count Badge */}
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-black/70 text-white border-0">
                    {bundle.contentItems.length} items
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-black/90 border-t border-zinc-800/50 backdrop-blur-sm">
                <div className="space-y-3">
                  {/* Title and Description */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-white text-base mb-1 line-clamp-1 tracking-tight">
                      {bundle.title}
                    </h3>
                    {bundle.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{bundle.description}</p>
                    )}
                  </div>

                  {/* Price and Purchase */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-light text-white tracking-tight">${bundle.price.toFixed(2)}</span>
                      <span className="text-xs text-zinc-400 uppercase font-medium ml-1">{bundle.currency}</span>
                    </div>

                    {isOwner ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-700/70 text-zinc-300 hover:bg-zinc-800/80 bg-transparent text-xs px-3 py-1.5 h-auto"
                        onClick={() => router.push(`/dashboard/bundles`)}
                      >
                        Manage
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs px-3 py-1.5 h-auto shadow-sm"
                        onClick={() => handlePurchase(bundle)}
                        disabled={purchaseLoading === bundle.id}
                      >
                        {purchaseLoading === bundle.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3 w-3 mr-1.5" />
                            Unlock Now
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
      </div>
    </div>
  )
}
