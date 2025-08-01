"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Package, Loader2, AlertCircle, ShoppingCart } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useFirebaseAuthSafe } from "@/hooks/use-firebase-auth-safe"
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
  // Use dual auth approach like the debug page
  const contextAuth = useAuth()
  const firebaseAuth = useFirebaseAuthSafe()

  // Determine which auth has an active user
  const activeUser = contextAuth.user || firebaseAuth.user
  const authSource = contextAuth.user ? "context" : firebaseAuth.user ? "firebase" : "none"

  const { toast } = useToast()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null)
  const router = useRouter()

  // Log auth status for debugging
  useEffect(() => {
    console.log("🔐 [Premium Content] Auth Status:", {
      contextUser: !!contextAuth.user,
      contextUid: contextAuth.user?.uid,
      firebaseUser: !!firebaseAuth.user,
      firebaseUid: firebaseAuth.user?.uid,
      activeUser: !!activeUser,
      activeUid: activeUser?.uid,
      authSource,
    })
  }, [contextAuth.user, firebaseAuth.user, activeUser, authSource])

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

  // Handle bundle purchase with dual auth approach
  const handlePurchase = async (bundle: Bundle) => {
    if (!activeUser) {
      console.log("❌ [Premium Content] No active user found in either auth context")
      console.log("🔐 [Premium Content] Auth debug:", {
        contextAuth: !!contextAuth.user,
        firebaseAuth: !!firebaseAuth.user,
        authSource,
      })

      toast({
        title: "Authentication Required",
        description: "Please log in to purchase this bundle",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    try {
      setPurchaseLoading(bundle.id)
      console.log(`🛒 [Premium Content] Starting purchase for bundle: ${bundle.id}`)
      console.log(`👤 [Premium Content] Using auth source: ${authSource}`)
      console.log(`👤 [Premium Content] Active user details:`, {
        uid: activeUser.uid,
        email: activeUser.email,
        displayName: activeUser.displayName,
      })

      // Get fresh Firebase ID token from the active user
      console.log(`🔑 [Premium Content] Getting fresh ID token from ${authSource} auth...`)
      const idToken = await activeUser.getIdToken(true) // Force refresh
      console.log(`✅ [Premium Content] Got ID token (length: ${idToken.length})`)

      // Prepare checkout data
      const checkoutData = {
        priceId: bundle.priceId || `price_${bundle.id}`,
        bundleId: bundle.id,
        successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}&buyer_uid=${activeUser.uid}`,
        cancelUrl: window.location.href,
      }

      console.log(`📦 [Premium Content] Checkout data:`, {
        bundleId: checkoutData.bundleId,
        priceId: checkoutData.priceId,
        buyerUid: activeUser.uid,
        authSource,
        hasToken: !!idToken,
        tokenLength: idToken.length,
      })

      // Make the API call
      console.log(`📡 [Premium Content] Making checkout API call...`)
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(checkoutData),
      })

      console.log(`📡 [Premium Content] Checkout response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ [Premium Content] Checkout failed:`, {
          status: response.status,
          error: errorData.error,
          code: errorData.code,
          details: errorData.details,
          authSource,
          activeUserUid: activeUser.uid,
        })

        // Provide more specific error messages
        let errorMessage = errorData.error || "Failed to create checkout session"

        if (errorData.code === "MISSING_TOKEN") {
          errorMessage = `Authentication token missing (${authSource} auth). Please try logging out and back in.`
        } else if (errorData.code === "INVALID_TOKEN") {
          errorMessage = `Authentication token invalid (${authSource} auth). Please try logging out and back in.`
        } else if (errorData.code === "NO_STRIPE_ACCOUNT") {
          errorMessage = "This creator hasn't connected their payment account yet."
        } else if (errorData.code === "STRIPE_ACCOUNT_INCOMPLETE") {
          errorMessage = "This creator needs to complete their payment setup."
        } else if (errorData.code === "ALREADY_PURCHASED") {
          errorMessage = "You already own this content!"
        } else if (errorData.code === "BUNDLE_INACTIVE") {
          errorMessage = "This content is currently unavailable."
        } else if (response.status === 401) {
          errorMessage = `Authentication failed with ${authSource} auth. Please try logging out and back in.`
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`✅ [Premium Content] Checkout session created:`, {
        sessionId: data.sessionId,
        buyerUid: data.buyerUid,
        bundleId: data.bundleId,
        authSource,
        hasUrl: !!data.url,
      })

      // Verify returned buyer UID matches authenticated user
      if (data.buyerUid && data.buyerUid !== activeUser.uid) {
        console.error("❌ [Premium Content] Buyer UID mismatch:", {
          returnedBuyerUid: data.buyerUid,
          authUserUid: activeUser.uid,
          authSource,
        })
        throw new Error("Authentication mismatch - please try again")
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        console.log(`🔗 [Premium Content] Redirecting to checkout: ${data.url}`)
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received from server")
      }
    } catch (error: any) {
      console.error("❌ [Premium Content] Purchase error:", {
        error: error.message,
        authSource,
        activeUserUid: activeUser?.uid,
        bundleId: bundle.id,
      })

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
              const debugUrl = `/debug-checkout-auth`
              window.open(debugUrl, "_blank")
            }}
          >
            Debug Auth
          </Button>
        ) : undefined,
      })
    } finally {
      setPurchaseLoading(null)
    }
  }

  // Get the best available thumbnail with priority order and validation
  const getBundleThumbnail = (bundle: Bundle): string => {
    console.log(`🖼️ [Premium Content] Getting thumbnail for bundle ${bundle.id}:`, {
      customPreviewThumbnail: bundle.customPreviewThumbnail,
      coverImage: bundle.coverImage,
      coverImageUrl: bundle.coverImageUrl,
    })

    // Priority: customPreviewThumbnail > coverImage > coverImageUrl > placeholder
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
      {/* Auth Debug Info (only show in development) */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-zinc-500 bg-zinc-900/50 p-2 rounded border border-zinc-800">
          Auth: {authSource} | User: {activeUser?.uid || "none"} | Email: {activeUser?.email || "none"}
        </div>
      )}

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
                {/* Bundle Thumbnail */}
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
                        disabled={purchaseLoading === bundle.id || !activeUser}
                      >
                        {purchaseLoading === bundle.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Processing...
                          </>
                        ) : !activeUser ? (
                          <>
                            <ShoppingCart className="h-3 w-3 mr-1.5" />
                            Login to Buy
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
