"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { Package, DollarSign, Users, Calendar } from "lucide-react"
import PremiumContentPurchaseButton from "./premium-content-purchase-button"
import { motion } from "framer-motion"

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  currency: string
  thumbnailUrl?: string
  customPreviewThumbnail?: string
  contentItems: string[]
  totalSales?: number
  createdAt?: any
  active: boolean
  creatorId: string
}

interface EnhancedProductBoxDisplayProps {
  creatorId: string
  creatorUsername?: string
  className?: string
}

export default function EnhancedProductBoxDisplay({
  creatorId,
  creatorUsername,
  className = "",
}: EnhancedProductBoxDisplayProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProductBoxes = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`🔍 [Product Box Display] Fetching bundles for creator: ${creatorId}`)

        const response = await fetch(`/api/creator/${creatorId}/product-boxes`)

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`ℹ️ [Product Box Display] No bundles found for creator: ${creatorId}`)
            setProductBoxes([])
            return
          }
          throw new Error(`Failed to fetch product boxes: ${response.status}`)
        }

        const data = await response.json()
        const boxes = Array.isArray(data.productBoxes) ? data.productBoxes : []

        // Filter only active product boxes
        const activeBoxes = boxes.filter((box: ProductBox) => box.active)

        console.log(`✅ [Product Box Display] Loaded ${activeBoxes.length} active bundles`)
        setProductBoxes(activeBoxes)
      } catch (error) {
        console.error("❌ [Product Box Display] Error fetching product boxes:", error)
        setError(error instanceof Error ? error.message : "Failed to load bundles")
      } finally {
        setLoading(false)
      }
    }

    if (creatorId) {
      fetchProductBoxes()
    }
  }, [creatorId])

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-red-400" />
          <h3 className="text-xl font-semibold text-white">Premium Content</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader>
                <Skeleton className="h-4 w-3/4 bg-zinc-700" />
                <Skeleton className="h-3 w-1/2 bg-zinc-700" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full bg-zinc-700 mb-4" />
                <Skeleton className="h-10 w-full bg-zinc-700" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-red-400" />
          <h3 className="text-xl font-semibold text-white">Premium Content</h3>
        </div>
        <Card className="bg-red-900/20 border-red-800/50">
          <CardContent className="p-6 text-center">
            <p className="text-red-400">Failed to load premium content</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (productBoxes.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-red-400" />
          <h3 className="text-xl font-semibold text-white">Premium Content</h3>
        </div>
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No premium content available yet</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-red-400" />
        <h3 className="text-xl font-semibold text-white">Premium Content</h3>
        <Badge variant="secondary" className="ml-2">
          {productBoxes.length} {productBoxes.length === 1 ? "item" : "items"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {productBoxes.map((productBox, index) => (
          <motion.div
            key={productBox.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700/50 transition-all duration-300 h-full">
              {/* Thumbnail */}
              {(productBox.thumbnailUrl || productBox.customPreviewThumbnail) && (
                <div className="aspect-video bg-zinc-800 rounded-t-lg overflow-hidden">
                  <img
                    src={productBox.customPreviewThumbnail || productBox.thumbnailUrl || "/placeholder.svg"}
                    alt={productBox.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white line-clamp-2">{productBox.title}</CardTitle>
                    {productBox.description && (
                      <CardDescription className="mt-2 text-zinc-400 line-clamp-3">
                        {productBox.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-white">
                      {formatPrice(productBox.price, productBox.currency)}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-zinc-700">
                    {productBox.contentItems?.length || 0} items
                  </Badge>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{productBox.totalSales || 0} sales</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(productBox.createdAt)}</span>
                  </div>
                </div>

                {/* Purchase Button */}
                <div className="pt-2">
                  <PremiumContentPurchaseButton
                    productBoxId={productBox.id}
                    productName={productBox.title}
                    price={productBox.price}
                    currency={productBox.currency}
                    creatorUsername={creatorUsername}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
