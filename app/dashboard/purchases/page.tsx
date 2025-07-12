"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Eye, User, RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  mimeType: string
  fileSize: number
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string
}

interface Purchase {
  id: string
  bundleId: string
  productBoxId: string
  bundleTitle: string
  bundleDescription?: string
  thumbnailUrl?: string
  creatorUsername: string
  price: number
  currency: string
  purchaseDate: any
  status: string
  contentItems?: ContentItem[]
  totalItems: number
  totalSize: number
  accessToken?: string
  isAnonymous?: boolean
}

export default function PurchasesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPurchases()
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      // First try to fetch anonymous purchases using access tokens from cookies
      try {
        const anonymousResponse = await fetch("/api/user/anonymous-purchases", {
          credentials: "include", // Include cookies
        })

        if (anonymousResponse.ok) {
          const anonymousData = await anonymousResponse.json()
          const anonymousPurchases = Array.isArray(anonymousData) ? anonymousData : anonymousData.purchases || []

          if (anonymousPurchases.length > 0) {
            console.log(`✅ [Purchases] Found ${anonymousPurchases.length} anonymous purchases`)
            setPurchases(anonymousPurchases)
            setLoading(false)
            return
          }
        }
      } catch (anonymousError) {
        console.log("No anonymous purchases found, trying authenticated purchases")
      }

      // Fallback to authenticated purchases if user is logged in
      if (user) {
        const idToken = await user.getIdToken()
        const response = await fetch("/api/user/unified-purchases", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const userPurchases = Array.isArray(data) ? data : data.purchases || []
          console.log(`✅ [Purchases] Found ${userPurchases.length} authenticated purchases`)
          setPurchases(userPurchases)
        } else {
          throw new Error("Failed to fetch authenticated purchases")
        }
      } else {
        // No user and no anonymous purchases
        setPurchases([])
      }
    } catch (err) {
      console.error("Error fetching purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to load purchases")
      toast({
        title: "Error",
        description: "Failed to load your purchases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (date: any): string => {
    if (!date) return ""
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date)
      return dateObj.toLocaleDateString()
    } catch {
      return ""
    }
  }

  const handleViewContent = (purchase: Purchase) => {
    const bundleId = purchase.bundleId || purchase.productBoxId
    if (bundleId) {
      router.push(`/product-box/${bundleId}/content`)
    } else {
      toast({
        title: "Error",
        description: "Unable to access content for this purchase",
        variant: "destructive",
      })
    }
  }

  const handleCreatorProfile = (purchase: Purchase) => {
    if (purchase.creatorUsername) {
      router.push(`/creator/${purchase.creatorUsername}`)
    } else {
      toast({
        title: "Error",
        description: "Creator profile not available",
        variant: "destructive",
      })
    }
  }

  const toggleExpanded = (purchaseId: string) => {
    setExpandedPurchases((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(purchaseId)) {
        newSet.delete(purchaseId)
      } else {
        newSet.add(purchaseId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black/40 backdrop-blur-xl p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <span className="ml-3 text-white">Loading your purchases...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black/40 backdrop-blur-xl p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-white text-2xl font-bold mb-4">Error Loading Purchases</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={fetchPurchases} className="bg-white text-black hover:bg-gray-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black/40 backdrop-blur-xl p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-gray-400">
            {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
          </p>
        </div>

        {/* Purchases List */}
        {purchases.length > 0 ? (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-black/40 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden"
              >
                {/* Purchase Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <img
                        src={purchase.thumbnailUrl || "/placeholder.svg?height=80&width=80"}
                        alt={purchase.bundleTitle}
                        className="w-20 h-20 rounded-lg object-cover bg-gray-800"
                      />
                    </div>

                    {/* Purchase Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-white mb-1 truncate">{purchase.bundleTitle}</h3>
                      {purchase.bundleDescription && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{purchase.bundleDescription}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{purchase.creatorUsername}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>
                            ${purchase.price.toFixed(2)} {purchase.currency?.toUpperCase() || "USD"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{purchase.totalItems || 0}</div>
                      <div className="text-sm text-gray-400">Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{formatFileSize(purchase.totalSize || 0)}</div>
                      <div className="text-sm text-gray-400">Total Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">∞</div>
                      <div className="text-sm text-gray-400">Lifetime</div>
                    </div>
                  </div>

                  {/* Content Items - Collapsible */}
                  {purchase.contentItems && purchase.contentItems.length > 0 && (
                    <Collapsible
                      open={expandedPurchases.has(purchase.id)}
                      onOpenChange={() => toggleExpanded(purchase.id)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 mt-4 text-white hover:text-gray-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Content ({purchase.contentItems.length} items)</span>
                          {expandedPurchases.has(purchase.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {purchase.contentItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <div className="text-gray-400">
                                {item.contentType === "video"
                                  ? "🎥"
                                  : item.contentType === "audio"
                                    ? "🎵"
                                    : item.contentType === "image"
                                      ? "🖼️"
                                      : "📄"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate">{item.title}</div>
                                <div className="text-gray-400 text-xs">
                                  {formatFileSize(item.fileSize)}
                                  {item.duration && ` • ${Math.round(item.duration)}s`}
                                  {item.contentType && ` • ${item.contentType}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => handleViewContent(purchase)}
                      variant="outline"
                      className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/40"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Content
                    </Button>
                    <Button
                      onClick={() => handleCreatorProfile(purchase)}
                      variant="outline"
                      className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/40"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Creator Profile
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 text-6xl mb-4">🛒</div>
            <h3 className="text-white text-xl font-semibold mb-2">No Purchases Yet</h3>
            <p className="text-gray-400 mb-6">You haven't made any purchases yet. Browse our content to get started!</p>
            <Button onClick={() => router.push("/")} className="bg-white text-black hover:bg-gray-100">
              Browse Content
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
