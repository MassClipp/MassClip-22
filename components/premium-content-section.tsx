"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Package, Loader2, AlertCircle, ShoppingCart } from "lucide-react"
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
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const router = useRouter()

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
      console.log(`🛒 [Premium Content] Starting purchase for bundle: ${bundle.id}`)

      const idToken = await user.getIdToken()
      console.log(`🔑 [Premium Content] Got ID token for user: ${user.uid}`)

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

      console.log(`📡 [Premium Content] Checkout response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ [Premium Content] Checkout failed:`, errorData)

        let errorMessage = errorData.error || "Failed to create checkout session"

        if (errorData.code === "NO_STRIPE_ACCOUNT") {
          errorMessage = "This creator hasn't connected their payment account yet."
        } else if (errorData.code === "STRIPE_ACCOUNT_INCOMPLETE") {
          errorMessage = "This creator needs to complete their payment setup."
        } else if (errorData.code === "STRIPE_VERIFICATION_FAILED") {
          errorMessage = "Unable to verify creator's payment setup. Please try again later."
        } else if (errorData.code === "ALREADY_PURCHASED") {
          errorMessage = "You already own this content!"
        } else if (errorData.code === "BUNDLE_INACTIVE") {
          errorMessage = "This content is currently unavailable."
        } else if (errorData.stripeCode === "amount_too_small") {
          errorMessage = `Minimum charge amount is $${(errorData.details?.minimum_amount || 50) / 100} ${bundle.currency.toUpperCase()}`
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`✅ [Premium Content] Checkout session created:`, data.sessionId)

      if (data.url) {
        console.log(`🔗 [Premium Content] Redirecting to checkout: ${data.url}`)
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("❌ [Premium Content] Purchase error:", error)

      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout process"

      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
        action: bundle.id ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const debugUrl = `/debug-stripe-checkout?bundleId=${bundle.id}`
              window.open(debugUrl, "_blank")
            }}
          >
            Debug Issue
          </Button>
        ) : undefined,
      })
    } finally {
      setPurchaseLoading(null)
    }
  }

  const getBundleThumbnail = (bundle: Bundle): string => {
    console.log(`🖼️ [Premium Content] Getting thumbnail for bundle ${bundle.id}:`, {
      customPreviewThumbnail: bundle.customPreviewThumbnail,
      coverImage: bundle.coverImage,
      coverImageUrl: bundle.coverImageUrl,
    })

    const possibleUrls = [bundle.customPreviewThumbnail, bundle.coverImage, bundle.coverImageUrl].filter(Boolean)

    for (const url of possibleUrls) {
      if (url && typeof url === "string" && url.startsWith("http")) {
        console.log(`✅ [Premium Content] Using thumbnail URL: ${url}`)
        return url
      }
    }

    console.log(`⚠️ [Premium Content] No valid thumbnail found for bundle ${bundle.id}, using placeholder`)
    return "/placeholder.svg?height=400&width=400&text=Bundle"
  }

  const toggleDescription = (bundleId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(bundleId)) {
        newSet.delete(bundleId)
      } else {
        newSet.add(bundleId)
      }
      return newSet
    })
  }

  const shouldTruncateDescription = (description: string) => {
    return description && description.length > 40
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {bundles.map((bundle, index) => (
          <motion.div
            key={bundle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all duration-300 group">
              <div className="relative">
                <div className="aspect-square bg-zinc-800 overflow-hidden">
                  <img
                    src={getBundleThumbnail(bundle) || "/placeholder.svg"}
                    alt={bundle.title}
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

                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-black/70 text-white border-0">
                    {bundle.contentItems.length} items
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-black/90 border-t border-zinc-800/50 backdrop-blur-sm">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-white text-base mb-1 line-clamp-1 tracking-tight">
                      {bundle.title}
                    </h3>
                    {bundle.description && (
                      <div className="text-xs text-zinc-400 leading-relaxed">
                        {shouldTruncateDescription(bundle.description) ? (
                          <div>
                            <p className={expandedDescriptions.has(bundle.id) ? "" : "line-clamp-2"}>
                              {bundle.description}
                            </p>
                            <button
                              onClick={() => toggleDescription(bundle.id)}
                              className="text-zinc-300 hover:text-white transition-colors mt-1 text-xs font-medium"
                            >
                              {expandedDescriptions.has(bundle.id) ? "Show less" : "Show more"}
                            </button>
                          </div>
                        ) : (
                          <p>{bundle.description}</p>
                        )}
                      </div>
                    )}
                  </div>

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
