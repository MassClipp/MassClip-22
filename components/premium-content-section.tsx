"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eye, ChevronDown, Unlock, Loader2, AlertCircle, Lock, Grid3X3, List } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"

interface ProductBox {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  type: string
  coverImage: string | null
  contentItems: string[]
  active: boolean
  customPreviewThumbnail?: string | null
  customPreviewDescription?: string | null
  createdAt: any
  updatedAt: any
}

interface PremiumContentSectionProps {
  creatorId: string
  creatorUsername?: string
  isOwner?: boolean
  className?: string
}

const PremiumContentSection: React.FC<PremiumContentSectionProps> = ({
  creatorId,
  creatorUsername = "",
  isOwner = false,
  className = "",
}) => {
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({})
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { toast } = useToast()
  const [checkoutLoading, setCheckoutLoading] = useState<{ [key: string]: boolean }>({})
  const { user } = useAuth() // Moved useAuth hook to the top level
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const fetchToken = async () => {
      if (user) {
        try {
          const idToken = await user.getIdToken()
          setToken(idToken)
        } catch (error) {
          console.error("Error fetching token:", error)
          setToken(null)
        }
      } else {
        setToken(null)
      }
    }

    fetchToken()
  }, [user])

  // Fetch product boxes from API
  const fetchProductBoxes = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Premium Content] Fetching for creator: ${creatorId}`)

      const response = await fetch(`/api/creator/${creatorId}/product-boxes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      // Safely handle the data - ensure productBoxes is always an array
      const boxes = Array.isArray(data.productBoxes)
        ? data.productBoxes.filter((box: ProductBox) => box && box.active)
        : []

      // Sort by creation date (newest first)
      boxes.sort((a: ProductBox, b: ProductBox) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.seconds - a.createdAt.seconds
      })

      setProductBoxes(boxes)
      console.log(`✅ [Premium Content] Loaded ${boxes.length} product boxes`)
    } catch (error) {
      console.error("❌ [Premium Content] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  // Run diagnostic when checkout fails
  const runCheckoutDiagnostic = async (productBoxId: string) => {
    try {
      console.log("🔍 [Diagnostic] Running comprehensive checkout diagnostic...")

      // Test 1: Firestore connection
      console.log("🧪 [Diagnostic] Testing Firestore connection...")
      const firestoreResponse = await fetch("/api/debug/firestore-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          collection: "productBoxes",
          action: "list",
          userId: user?.uid,
        }),
      })

      if (firestoreResponse.ok) {
        const firestoreData = await firestoreResponse.json()
        console.log("✅ [Diagnostic] Firestore connection test passed:", firestoreData)
      } else {
        const firestoreError = await firestoreResponse.json()
        console.error("❌ [Diagnostic] Firestore connection test failed:", firestoreError)

        toast({
          title: "Database Connection Failed",
          description: firestoreError.details || "Unable to connect to database",
          variant: "destructive",
        })
        return
      }

      // Continue with other tests...
      console.log("✅ [Diagnostic] All tests completed")
    } catch (error) {
      console.error("❌ [Diagnostic] Failed:", error)
      toast({
        title: "Diagnostic Failed",
        description: "Unable to run diagnostic tests",
        variant: "destructive",
      })
    }
  }

  // Handle purchase action with Stripe checkout
  const handlePurchase = async (productBox: ProductBox) => {
    try {
      setCheckoutLoading((prev) => ({ ...prev, [productBox.id]: true }))

      console.log(`🛒 [Checkout] Initiating purchase for product box: ${productBox.id}`)

      // Get current user and auth token
      if (!user) {
        throw new Error("Please sign in to make a purchase")
      }

      if (!token) {
        throw new Error("Authentication token is missing. Please try again.")
      }

      console.log(`🔑 [Checkout] Got auth token for user: ${user.uid}`)

      // Validate product box before attempting checkout
      if (!productBox.active) {
        throw new Error("This product is no longer available")
      }

      // Create Stripe checkout session with proper authentication
      const response = await fetch(`/api/creator/product-boxes/${productBox.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBox.id}`,
          cancelUrl: window.location.href,
        }),
      })

      console.log(`🛒 [Checkout] API response status:`, response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }))

        console.error("❌ [Checkout] API error:", errorData)

        throw new Error(
          errorData.error || errorData.details || `Failed to create checkout session (${response.status})`,
        )
      }

      const { url, sessionId } = await response.json()

      if (!url) {
        throw new Error("No checkout URL received from server")
      }

      console.log(`✅ [Checkout] Created session ${sessionId}, redirecting to Stripe`)

      // Show success message before redirect
      toast({
        title: "Redirecting to checkout...",
        description: "You'll be redirected to Stripe to complete your purchase.",
      })

      // Small delay to show the toast, then redirect
      setTimeout(() => {
        window.location.href = url
      }, 1000)
    } catch (error) {
      console.error("❌ [Checkout] Error:", error)
      setCheckoutLoading((prev) => ({ ...prev, [productBox.id]: false }))

      const errorMessage = error instanceof Error ? error.message : "Unable to process checkout. Please try again."

      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Format price display
  const formatPrice = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  // Handle image load errors
  const handleImageError = (imageId: string) => {
    setImageErrors((prev) => ({ ...prev, [imageId]: true }))
  }

  // Toggle preview expansion
  const togglePreview = (productBoxId: string) => {
    setExpandedPreview(expandedPreview === productBoxId ? null : productBoxId)
  }

  useEffect(() => {
    if (creatorId) {
      fetchProductBoxes()
    }
  }, [creatorId])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-lg font-light">Loading premium content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h3 className="text-2xl font-normal text-white mb-3">Failed to Load Premium Content</h3>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto font-light">{error}</p>
        <Button
          onClick={fetchProductBoxes}
          className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-black font-normal rounded-lg"
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (productBoxes.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <Lock className="h-10 w-10 text-zinc-600" />
          </div>
          <h3 className="text-2xl font-light text-white mb-3">No Premium Content Available</h3>
          <p className="text-zinc-400 leading-relaxed font-light">
            {isOwner
              ? "Create product boxes to offer premium content to your audience."
              : "This creator hasn't set up any premium content packages yet."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-800/50 p-1.5 flex shadow-lg">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 rounded-md transition-all duration-200 ${
              viewMode === "grid"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded-md transition-all duration-200 ${
              viewMode === "list"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Product Boxes */}
      <motion.div
        layout
        className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-6"}
      >
        {productBoxes.map((productBox, index) => (
          <motion.div
            key={productBox.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="group"
          >
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-sm border border-zinc-800/50 rounded-lg overflow-hidden shadow-xl hover:shadow-2xl hover:border-zinc-700/50 transition-all duration-300 relative">
              {/* Membership Badge - Enhanced with gold gradient and glossy effect */}
              {productBox.type === "subscription" && (
                <div className="absolute top-2 right-2 z-10 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-black text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-lg border border-amber-300/50 backdrop-blur-sm">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-full"></div>
                    <span className="relative z-10 tracking-wide">MEMBERSHIP</span>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="space-y-3">
                  <h3 className="text-xl font-light text-white group-hover:text-red-400 transition-colors duration-200 tracking-wide">
                    {productBox.title}
                  </h3>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-emerald-500 text-xl font-light">$</span>
                    <span className="text-4xl font-normal text-white tracking-tight">
                      {productBox.price.toFixed(2)}
                    </span>

                    {/* Show recurring indicator for subscriptions */}
                    {productBox.type === "subscription" && <span className="text-zinc-400 text-sm ml-1">/month</span>}
                  </div>

                  {/* Content Count */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm bg-zinc-600"></div>
                    <span className="text-zinc-400 text-sm font-light">
                      {productBox.contentItems?.length || 0} content item
                      {!productBox.contentItems || productBox.contentItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Preview Button - SLIMMER */}
                  <button
                    onClick={() => togglePreview(productBox.id)}
                    className="w-full flex items-center justify-center gap-3 py-1.5 px-4 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-lg text-zinc-300 hover:text-white transition-all duration-200 border border-zinc-700/50 hover:border-zinc-600/50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="font-light text-sm">Preview ({productBox.contentItems?.length || 0})</span>
                    <motion.div
                      animate={{ rotate: expandedPreview === productBox.id ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.div>
                  </button>

                  {/* Unlock Button - LARGER */}
                  {!isOwner && (
                    <button
                      onClick={() => handlePurchase(productBox)}
                      disabled={checkoutLoading[productBox.id]}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 disabled:from-amber-400 disabled:via-yellow-400 disabled:to-amber-400 disabled:cursor-not-allowed rounded-lg text-black font-normal shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none disabled:shadow-lg"
                    >
                      {checkoutLoading[productBox.id] ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4" />
                          <span>Unlock {productBox.type === "subscription" ? "Membership" : "Now"}</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Owner Message */}
                  {isOwner && (
                    <div className="text-center py-2.5 px-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30 mt-2">
                      <span className="text-xs text-zinc-500 font-light">
                        Owner view - visitors will see purchase button
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Preview */}
                <AnimatePresence>
                  {expandedPreview === productBox.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-6 border-t border-zinc-800/50">
                        <div className="flex gap-4">
                          {/* Preview Thumbnail */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 shadow-inner">
                            {(productBox.customPreviewThumbnail || productBox.coverImage) &&
                            !imageErrors[productBox.id] ? (
                              <Image
                                src={productBox.customPreviewThumbnail || productBox.coverImage || "/placeholder.svg"}
                                alt={productBox.title}
                                width={96}
                                height={96}
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(productBox.id)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                <span className="text-2xl font-light text-white">
                                  {productBox.title.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Preview Description */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-300 leading-relaxed break-words font-light tracking-wide">
                              {productBox.customPreviewDescription ||
                                productBox.description ||
                                "Experience premium content with exclusive access to high-quality materials and bonus features."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export default PremiumContentSection
