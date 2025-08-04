"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Package, Eye, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

// NOTE: This is the PRIMARY purchases page component design.
// DO NOT deviate from this design. Keep it exactly as specified.

interface Purchase {
  id: string
  title?: string
  description?: string
  price: number
  currency: string
  status: string
  createdAt: any
  updatedAt: any
  productBoxId?: string
  bundleId?: string
  creatorId?: string
  creatorUsername?: string
  type?: "product_box" | "bundle" | "subscription"
  downloadUrl?: string
  thumbnailUrl?: string
  metadata?: {
    title?: string
    description?: string
    contentCount?: number
    thumbnailUrl?: string
    [key: string]: any
  }
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPurchases()
    }
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.status}`)
      }

      const data = await response.json()

      // Ensure all purchases have required fields with fallbacks
      const normalizedPurchases = (data.purchases || []).map((purchase: any) => ({
        id: purchase.id || "",
        title: purchase.title || purchase.metadata?.title || "Untitled Purchase",
        description: purchase.description || purchase.metadata?.description || "",
        price: purchase.price || 0,
        currency: purchase.currency || "usd",
        status: purchase.status || "completed",
        createdAt: purchase.createdAt || new Date(),
        updatedAt: purchase.updatedAt || new Date(),
        productBoxId: purchase.productBoxId || null,
        bundleId: purchase.bundleId || null,
        creatorId: purchase.creatorId || "",
        creatorUsername: purchase.creatorUsername || "Unknown Creator",
        type: purchase.type || "product_box",
        downloadUrl: purchase.downloadUrl || "",
        thumbnailUrl: purchase.thumbnailUrl || purchase.metadata?.thumbnailUrl || "",
        metadata: {
          ...purchase.metadata,
          contentCount: purchase.metadata?.contentCount || 0,
          thumbnailUrl: purchase.metadata?.thumbnailUrl || purchase.thumbnailUrl || "",
        },
      }))

      setPurchases(normalizedPurchases)
    } catch (err) {
      console.error("Error fetching purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  const getThumbnailUrl = (purchase: Purchase) => {
    return (
      purchase.thumbnailUrl ||
      purchase.metadata?.thumbnailUrl ||
      (purchase.type === "bundle" ? `/api/bundles/${purchase.bundleId}/thumbnail` : null) ||
      (purchase.productBoxId ? `/api/product-box/${purchase.productBoxId}/thumbnail` : null)
    )
  }

  if (authLoading || loading) {
    return (
      <>
        <Skeleton className="h-12 w-64 mb-8 bg-gray-800/50" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[#0d0d0d] border border-white/20 rounded-lg p-6"
              style={{
                background: `linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)`,
              }}
            >
              <div className="flex flex-col gap-4">
                <div className="flex gap-6">
                  <Skeleton className="w-24 h-24 bg-gray-700/50 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-48 mb-2 bg-gray-700/50" />
                    <Skeleton className="h-4 w-32 mb-2 bg-gray-700/50" />
                    <Skeleton className="h-4 w-24 mb-4 bg-gray-700/50" />
                    <Skeleton className="h-6 w-20 bg-gray-700/50" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full bg-gray-700/50" />
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <h1 className="text-4xl font-bold mb-8 text-white">My Purchases</h1>
        <Alert variant="destructive" className="bg-red-900/20 border-red-800 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchPurchases} className="bg-white text-black hover:bg-gray-200">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <h1 className="text-4xl font-bold mb-8 text-white">My Purchases</h1>

      {/* Content */}
      <AnimatePresence mode="wait">
        {purchases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <div className="max-w-md mx-auto">
              <Package className="h-16 w-16 mx-auto mb-6 text-gray-400" />
              <h3 className="text-2xl font-semibold mb-4 text-white">No purchases yet</h3>
              <p className="text-gray-400 mb-8 text-lg">Start exploring premium content to build your collection.</p>
              <Button asChild className="bg-white text-black hover:bg-gray-200 h-12 px-8 text-lg">
                <Link href="/dashboard/explore">Explore Content</Link>
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {purchases.map((purchase, index) => (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden rounded-lg border border-white/20 hover:border-white/40 transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)`,
                }}
              >
                {/* Subtle edge gradient overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    background: `linear-gradient(135deg, transparent 0%, #ffffff08 25%, transparent 50%, #ffffff08 75%, transparent 100%)`,
                  }}
                />

                <div className="relative p-6">
                  <div className="flex flex-col gap-4">
                    {/* Top section with thumbnail and info */}
                    <div className="flex gap-6">
                      {/* 1:1 Thumbnail - Curved corners */}
                      <div className="w-24 h-24 bg-black border border-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {getThumbnailUrl(purchase) ? (
                          <img
                            src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                            alt={purchase.title}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center bg-black rounded-lg">
                                    <svg class="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                    </svg>
                                  </div>
                                `
                              }
                            }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-500" />
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        {/* Title and Description */}
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">{purchase.title}</h3>
                          {purchase.description && (
                            <p className="text-gray-400 text-sm mb-2 line-clamp-2 leading-relaxed">
                              {purchase.description}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">
                            by {purchase.creatorUsername}
                          </p>
                          {purchase.metadata?.contentCount !== undefined && (
                            <p className="text-gray-500 text-xs uppercase tracking-wider">
                              {purchase.metadata.contentCount} item{purchase.metadata.contentCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="mt-2">
                          <span className="text-2xl font-bold text-white tracking-tight">
                            ${purchase.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom section with full-width button */}
                    <div className="flex justify-center">
                      <Button
                        asChild
                        className="bg-white text-black hover:bg-gray-200 font-medium px-8 py-2 rounded-lg border-0 transition-all duration-200 hover:shadow-lg w-full max-w-xs"
                      >
                        <Link
                          href={
                            purchase.type === "bundle"
                              ? `/bundles/${purchase.bundleId}/content`
                              : `/product-box/${purchase.productBoxId}/content`
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Access Content
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
