"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
  Lock,
  DollarSign,
  Eye,
  Loader2,
  AlertCircle,
  Video,
  Unlock,
  ChevronDown,
  ChevronUp,
  Play,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Bundle {
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

interface VideoItem {
  id: string
  title: string
  thumbnailUrl: string
  url: string
  type: string
  status: string
  description?: string
  duration?: number
  fileSize?: number
}

interface BundleDisplayProps {
  creatorId: string
  creatorUsername: string
  isOwner?: boolean
  onPurchase?: (bundle: Bundle) => void
  className?: string
  viewMode?: "grid" | "list"
}

export default function BundleDisplay({
  creatorId,
  creatorUsername,
  isOwner = false,
  onPurchase,
  className = "",
  viewMode = "grid",
}: BundleDisplayProps) {
  const { user } = useAuth()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contentVideos, setContentVideos] = useState<{ [key: string]: VideoItem[] }>({})
  const [contentLoading, setContentLoading] = useState<{ [key: string]: boolean }>({})
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({})
  const [userPurchases, setUserPurchases] = useState<string[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState<{ [key: string]: boolean }>({})
  const { toast } = useToast()

  // Fetch user's purchases
  const fetchUserPurchases = async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/product-box-access", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const purchasedIds = data.accessibleProductBoxes?.map((p: any) => p.productBoxId) || []
        setUserPurchases(purchasedIds)
      }
    } catch (error) {
      console.error("Error fetching user purchases:", error)
    }
  }

  // Fetch product boxes from API
  const fetchProductBoxes = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Product Box Display] Fetching for creator: ${creatorId}`)

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
      const boxes = data.productBoxes?.filter((box: Bundle) => box.active) || []

      // Sort by creation date (newest first)
      boxes.sort((a: Bundle, b: Bundle) => {
        if (!a.createdAt || !b.createdAt) return 0
        return b.createdAt.seconds - a.createdAt.seconds
      })

      setBundles(boxes)
      console.log(`✅ [Product Box Display] Loaded ${boxes.length} product boxes`)

      // Fetch content for each product box
      boxes.forEach((productBox: Bundle) => {
        fetchProductBoxContent(productBox)
      })
    } catch (error) {
      console.error("❌ [Product Box Display] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  // Fetch video content for a product box
  const fetchProductBoxContent = async (productBox: Bundle) => {
    if (productBox.contentItems.length === 0) {
      setContentVideos((prev) => ({ ...prev, [productBox.id]: [] }))
      return
    }

    try {
      setContentLoading((prev) => ({ ...prev, [productBox.id]: true }))

      const videoPromises = productBox.contentItems.map(async (videoId) => {
        try {
          const videoDoc = await getDoc(doc(db, "videos", videoId))
          if (videoDoc.exists()) {
            const data = videoDoc.data()
            return {
              id: videoDoc.id,
              title: data.title || "Untitled",
              thumbnailUrl: data.thumbnailUrl || "",
              url: data.url || "",
              type: data.type || "premium",
              status: data.status || "active",
              description: data.description || "",
              duration: data.duration || 0,
              fileSize: data.fileSize || 0,
            }
          }
          return null
        } catch (error) {
          console.error(`❌ [Product Box Display] Error fetching video ${videoId}:`, error)
          return null
        }
      })

      const videos = (await Promise.all(videoPromises)).filter(Boolean) as VideoItem[]
      setContentVideos((prev) => ({ ...prev, [productBox.id]: videos }))
    } catch (error) {
      console.error(`❌ [Product Box Display] Error fetching content:`, error)
      setContentVideos((prev) => ({ ...prev, [productBox.id]: [] }))
    } finally {
      setContentLoading((prev) => ({ ...prev, [productBox.id]: false }))
    }
  }

  // Handle purchase action with authentication check
  const handlePurchase = async (productBox: Bundle) => {
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to make a purchase.",
        variant: "destructive",
      })
      // Redirect to login page
      window.location.href = "/login"
      return
    }

    try {
      setCheckoutLoading((prev) => ({ ...prev, [productBox.id]: true }))

      console.log(`🛒 [Checkout] Initiating purchase for product box: ${productBox.id}`)

      // Validate product box before attempting checkout
      if (!productBox.active) {
        throw new Error("This product is no longer available")
      }

      // Get fresh ID token
      const idToken = await user.getIdToken(true) // Force refresh

      // Create Stripe checkout session
      const response = await fetch(`/api/creator/product-boxes/${productBox.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBox.id}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }))
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url, sessionId } = await response.json()

      if (!url) {
        throw new Error("No checkout URL received from server")
      }

      console.log(`✅ [Checkout] Created session ${sessionId}, redirecting to Stripe`)

      toast({
        title: "Redirecting to checkout...",
        description: "You'll be redirected to complete your purchase.",
      })

      // Redirect to Stripe checkout
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

  // Handle accessing purchased content
  const handleAccessContent = (productBoxId: string) => {
    window.open(`/product-box/${productBoxId}/content`, "_blank")
  }

  // Format price display
  const formatPrice = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Handle image load errors
  const handleImageError = (imageId: string) => {
    setImageErrors((prev) => ({ ...prev, [imageId]: true }))
  }

  // Toggle preview expansion
  const togglePreview = (productBoxId: string) => {
    setExpandedPreview(expandedPreview === productBoxId ? null : productBoxId)
  }

  // Check if user has purchased this product box
  const hasPurchased = (productBoxId: string) => {
    return userPurchases.includes(productBoxId)
  }

  useEffect(() => {
    if (creatorId) {
      fetchProductBoxes()
    }
  }, [creatorId])

  useEffect(() => {
    if (user) {
      fetchUserPurchases()
    }
  }, [user])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading premium content...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Failed to Load Premium Content</h3>
        <p className="text-zinc-400 mb-4">{error}</p>
        <Button onClick={fetchProductBoxes} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
          Try Again
        </Button>
      </div>
    )
  }

  if (bundles.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Lock className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">No Premium Content Available</h3>
        <p className="text-zinc-400">
          {isOwner
            ? "Create product boxes to offer premium content to your audience."
            : "This creator hasn't set up any premium content packages yet."}
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Product Boxes Grid/List */}
      <motion.div
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" : "space-y-4"}
      >
        {bundles.map((productBox, index) => {
          const isPurchased = hasPurchased(productBox.id)
          const videos = contentVideos[productBox.id] || []

          return (
            <motion.div
              key={productBox.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="h-full"
            >
              <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700/50 transition-all duration-300 h-full flex flex-col group">
                {/* Cover Image */}
                {productBox.coverImage && (
                  <div className="h-48 bg-zinc-800 rounded-t-lg overflow-hidden relative flex-shrink-0">
                    {!imageErrors[productBox.id] ? (
                      <Image
                        src={productBox.coverImage || "/placeholder.svg"}
                        alt={productBox.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => handleImageError(productBox.id)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <Video className="h-12 w-12 text-zinc-600" />
                      </div>
                    )}

                    {/* Purchase Status Badge */}
                    {isPurchased && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500 text-white">Purchased</Badge>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white" />
                    </div>
                  </div>
                )}

                <CardHeader className="flex-1">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-white group-hover:text-red-400 transition-colors">
                        {productBox.title}
                      </CardTitle>
                      {productBox.type === "subscription" && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
                          Subscription
                        </Badge>
                      )}
                    </div>

                    {productBox.description && (
                      <CardDescription className="text-zinc-400 text-sm leading-relaxed">
                        {productBox.description}
                      </CardDescription>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    {/* Price Display */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center text-xl sm:text-2xl font-bold text-white">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-1" />
                        {formatPrice(productBox.price, productBox.currency)}
                      </div>
                      {productBox.type === "subscription" && (
                        <span className="text-xs sm:text-sm text-zinc-400">/month</span>
                      )}
                    </div>

                    {/* Content Count */}
                    <div className="text-xs sm:text-sm text-zinc-400">
                      {productBox.contentItems.length} content item{productBox.contentItems.length !== 1 ? "s" : ""}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-4 border-t border-zinc-800/50">
                      <div className="flex flex-col gap-3">
                        {/* Preview/Content Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePreview(productBox.id)}
                          className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all duration-200"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {isPurchased ? "View Content" : "Preview"} ({productBox.contentItems.length})
                          {expandedPreview === productBox.id ? (
                            <ChevronUp className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2" />
                          )}
                        </Button>

                        {/* Purchase/Access Button */}
                        {!isOwner && (
                          <>
                            {isPurchased ? (
                              <Button
                                onClick={() => handleAccessContent(productBox.id)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium transition-all duration-200"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Access Content
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handlePurchase(productBox)}
                                disabled={checkoutLoading[productBox.id]}
                                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium transition-all duration-200 disabled:opacity-50"
                              >
                                {checkoutLoading[productBox.id] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="h-4 w-4 mr-2" />
                                    Purchase Now
                                  </>
                                )}
                              </Button>
                            )}
                          </>
                        )}

                        {isOwner && (
                          <div className="text-center text-xs sm:text-sm text-zinc-500 py-2">
                            Owner view - visitors will see purchase button
                          </div>
                        )}
                      </div>

                      {/* Expandable Content Preview */}
                      <AnimatePresence>
                        {expandedPreview === productBox.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="mt-4 overflow-hidden"
                          >
                            {contentLoading[productBox.id] ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                                <span className="ml-2 text-sm text-zinc-400">Loading content...</span>
                              </div>
                            ) : (
                              <div className="pt-4 border-t border-zinc-800/50">
                                <h4 className="text-sm font-medium text-white mb-3">
                                  {isPurchased ? "Your Content:" : "Included Content:"}
                                </h4>

                                {videos.length > 0 ? (
                                  <div className="space-y-3">
                                    {videos.slice(0, isPurchased ? videos.length : 3).map((video, idx) => (
                                      <div
                                        key={video.id}
                                        className="flex gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30"
                                      >
                                        {/* Thumbnail */}
                                        <div className="w-16 h-12 bg-zinc-700 rounded overflow-hidden flex-shrink-0">
                                          {video.thumbnailUrl ? (
                                            <Image
                                              src={video.thumbnailUrl || "/placeholder.svg"}
                                              alt={video.title}
                                              width={64}
                                              height={48}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                              <Play className="h-4 w-4 text-zinc-500" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Content Info */}
                                        <div className="flex-1 min-w-0">
                                          <h5 className="text-sm font-medium text-white truncate">{video.title}</h5>
                                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                            {video.duration > 0 && <span>{formatDuration(video.duration)}</span>}
                                            {video.fileSize > 0 && <span>{formatFileSize(video.fileSize)}</span>}
                                          </div>
                                          {video.description && (
                                            <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                                              {video.description}
                                            </p>
                                          )}
                                        </div>

                                        {/* Action Button */}
                                        {isPurchased ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(video.url, "_blank")}
                                            className="border-zinc-600 hover:bg-zinc-700"
                                          >
                                            <Download className="h-3 w-3" />
                                          </Button>
                                        ) : (
                                          <div className="flex items-center justify-center w-8 h-8">
                                            <Lock className="h-3 w-3 text-zinc-500" />
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                    {/* Show more indicator for non-purchased */}
                                    {!isPurchased && videos.length > 3 && (
                                      <div className="text-center py-2">
                                        <span className="text-xs text-zinc-500">
                                          +{videos.length - 3} more items available after purchase
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <p className="text-sm text-zinc-500">No content items found</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
