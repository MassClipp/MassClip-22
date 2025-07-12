"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ShoppingBag,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Package,
  User,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface PurchaseItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  fileSize: number
  duration?: number
  contentType: string
  displaySize?: string
  displayDuration?: string
}

interface Purchase {
  id: string
  productBoxId: string
  bundleId?: string
  productBoxTitle: string
  productBoxDescription?: string
  productBoxThumbnail?: string
  creatorName: string
  creatorUsername: string
  amount: number
  currency: string
  status: string
  createdAt: any
  completedAt?: any
  totalItems: number
  totalSize: number
  items: PurchaseItem[]
  sessionId?: string
  source?: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchPurchases = async () => {
    if (!user?.uid) {
      console.log("No user ID available")
      setLoading(false)
      return
    }

    try {
      setError(null)
      console.log("Fetching purchases for user:", user.uid)

      const response = await fetch(`/api/user/unified-purchases?userId=${user.uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Purchases API response:", data)

      // Safely extract purchases array
      const purchasesArray = data?.purchases || data?.data || []

      // Ensure we have a valid array
      if (!Array.isArray(purchasesArray)) {
        console.warn("Invalid purchases data format:", data)
        setPurchases([])
        return
      }

      // Process and validate each purchase
      const validPurchases: Purchase[] = []

      for (const purchase of purchasesArray) {
        try {
          const processedPurchase: Purchase = {
            id: String(purchase.id || purchase.purchaseId || "unknown"),
            productBoxId: String(purchase.productBoxId || purchase.bundleId || ""),
            bundleId: String(purchase.bundleId || purchase.productBoxId || ""),
            productBoxTitle: String(purchase.productBoxTitle || purchase.bundleTitle || "Untitled"),
            productBoxDescription: String(purchase.productBoxDescription || purchase.description || ""),
            productBoxThumbnail: String(purchase.productBoxThumbnail || purchase.thumbnailUrl || ""),
            creatorName: String(purchase.creatorName || "Unknown Creator"),
            creatorUsername: String(purchase.creatorUsername || "unknown"),
            amount: Number(purchase.amount || 0),
            currency: String(purchase.currency || "usd").toUpperCase(),
            status: String(purchase.status || "unknown"),
            createdAt: purchase.createdAt || purchase.purchaseDate || new Date(),
            completedAt: purchase.completedAt || purchase.createdAt || new Date(),
            totalItems: Number(purchase.totalItems || 0),
            totalSize: Number(purchase.totalSize || 0),
            items: [],
            sessionId: String(purchase.sessionId || purchase.stripeSessionId || ""),
            source: String(purchase.source || "unknown"),
          }

          // Process items array safely
          const itemsArray = purchase.items || purchase.contents || []
          if (Array.isArray(itemsArray)) {
            for (const item of itemsArray) {
              if (item && typeof item === "object") {
                processedPurchase.items.push({
                  id: String(item.id || Math.random().toString(36)),
                  title: String(item.title || item.name || "Untitled"),
                  fileUrl: String(item.fileUrl || item.url || ""),
                  thumbnailUrl: String(item.thumbnailUrl || item.thumbnail || ""),
                  fileSize: Number(item.fileSize || 0),
                  duration: Number(item.duration || 0),
                  contentType: String(item.contentType || item.type || "unknown"),
                  displaySize: item.displaySize || formatFileSize(Number(item.fileSize || 0)),
                  displayDuration: item.displayDuration || formatDuration(Number(item.duration || 0)),
                })
              }
            }
          }

          validPurchases.push(processedPurchase)
        } catch (itemError) {
          console.warn("Error processing purchase item:", itemError, purchase)
        }
      }

      console.log(`Processed ${validPurchases.length} valid purchases`)
      setPurchases(validPurchases)
    } catch (err: any) {
      console.error("Error fetching purchases:", err)
      setError(err.message || "Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchPurchases()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading, retryCount])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    setLoading(true)
    fetchPurchases()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return ""
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes === 0) return `${remainingSeconds}s`
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatDate = (date: any): string => {
    try {
      if (!date) return "Unknown date"

      let dateObj: Date
      if (date.toDate && typeof date.toDate === "function") {
        dateObj = date.toDate()
      } else if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === "string" || typeof date === "number") {
        dateObj = new Date(date)
      } else {
        return "Unknown date"
      }

      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.warn("Error formatting date:", error, date)
      return "Unknown date"
    }
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Your purchased content and downloads</p>
        </div>

        <Alert className="bg-red-500/10 border-red-500/20 mb-6">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error loading purchases:</strong> {error}
          </AlertDescription>
        </Alert>

        <div className="flex space-x-4">
          <Button onClick={handleRetry} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
            <Link href="/dashboard">
              <Package className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // No user state
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <User className="h-16 w-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Please Sign In</h2>
          <p className="text-white/70 mb-6">You need to be signed in to view your purchases</p>
          <Button asChild className="bg-red-600 hover:bg-red-700">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (purchases.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Your purchased content and downloads</p>
        </div>

        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
          <p className="text-white/70 mb-6">
            You haven't made any purchases yet. Explore our content to find something you like!
          </p>
          <div className="space-x-4">
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <Link href="/dashboard/explore">
                <Eye className="w-4 h-4 mr-2" />
                Explore Content
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
              <Link href="/dashboard">
                <Package className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main purchases display
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
        <p className="text-white/70">
          You have {purchases.length} purchase{purchases.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-6">
        {purchases.map((purchase) => (
          <Card
            key={purchase.id}
            className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors"
          >
            <CardHeader>
              <div className="flex items-start space-x-4">
                {purchase.productBoxThumbnail && (
                  <img
                    src={purchase.productBoxThumbnail || "/placeholder.svg"}
                    alt={purchase.productBoxTitle}
                    className="w-20 h-20 rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=80&width=80&text=No+Image"
                    }}
                  />
                )}
                <div className="flex-1">
                  <CardTitle className="text-xl text-white mb-2">{purchase.productBoxTitle}</CardTitle>
                  {purchase.productBoxDescription && (
                    <p className="text-white/70 mb-2 line-clamp-2">{purchase.productBoxDescription}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      by {purchase.creatorName}
                    </span>
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />${purchase.amount.toFixed(2)} {purchase.currency}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(purchase.createdAt)}
                    </span>
                    <Badge
                      variant={purchase.status === "completed" ? "default" : "secondary"}
                      className={purchase.status === "completed" ? "bg-green-600" : ""}
                    >
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Content Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{purchase.totalItems}</div>
                  <div className="text-sm text-white/60">Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{formatFileSize(purchase.totalSize)}</div>
                  <div className="text-sm text-white/60">Total Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">∞</div>
                  <div className="text-sm text-white/60">Lifetime Access</div>
                </div>
              </div>

              {/* Content Items Preview */}
              {purchase.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white/80 mb-2">Content ({purchase.items.length} items)</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {purchase.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 p-2 bg-white/5 rounded text-sm">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          {item.contentType === "video" && <Eye className="h-4 w-4 text-white/60" />}
                          {item.contentType === "audio" && <Download className="h-4 w-4 text-white/60" />}
                          {(item.contentType === "image" || item.contentType === "document") && (
                            <Package className="h-4 w-4 text-white/60" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium truncate">{item.title}</p>
                          <div className="flex items-center space-x-2 text-xs text-white/60">
                            <span>{item.displaySize}</span>
                            {item.displayDuration && <span>• {item.displayDuration}</span>}
                            <span>• {item.contentType}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {purchase.items.length > 3 && (
                      <div className="text-center text-white/60 text-xs py-1">
                        +{purchase.items.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button asChild className="flex-1 bg-red-600 hover:bg-red-700">
                  <Link href={`/product-box/${purchase.productBoxId}/content`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Content
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  <Link href={`/creator/${purchase.creatorUsername}`}>
                    <User className="w-4 h-4 mr-2" />
                    Creator Profile
                  </Link>
                </Button>
                {purchase.sessionId && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    <Link href={`/purchase-success?session_id=${purchase.sessionId}`}>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-white/50">
        <p>All purchases include lifetime access • No subscription required</p>
      </div>
    </div>
  )
}
