"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useToast } from "@/hooks/use-toast"
import { Package, Edit, ExternalLink } from "lucide-react"
import Link from "next/link"

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  currency: string
  thumbnailUrl?: string
  contentCount: number
  isActive: boolean
  createdAt: any
}

interface PremiumContentSectionProps {
  creatorId: string
  isOwnProfile?: boolean
}

export default function PremiumContentSection({ creatorId, isOwnProfile = false }: PremiumContentSectionProps) {
  const { user } = useFirebaseAuth()
  const { toast } = useToast()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProductBoxes()
  }, [creatorId])

  const fetchProductBoxes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/creator/${creatorId}/product-boxes`)
      if (!response.ok) {
        throw new Error("Failed to fetch product boxes")
      }

      const data = await response.json()
      setProductBoxes(data.productBoxes || [])
    } catch (err) {
      console.error("Error fetching product boxes:", err)
      setError(err instanceof Error ? err.message : "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (productBoxId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to purchase content.",
        variant: "destructive",
      })
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/product-boxes/${productBoxId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Purchase error:", err)
      toast({
        title: "Purchase failed",
        description: "Failed to initiate purchase. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-24 h-24 bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4 bg-gray-700" />
                    <Skeleton className="h-4 w-full bg-gray-700" />
                    <Skeleton className="h-4 w-1/2 bg-gray-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={fetchProductBoxes} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    )
  }

  if (productBoxes.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Premium Content</h3>
        <p className="text-gray-400">
          {isOwnProfile
            ? "Create your first product box to start selling premium content."
            : "This creator hasn't published any premium content yet."}
        </p>
        {isOwnProfile && (
          <Button asChild className="mt-4 bg-red-600 hover:bg-red-700">
            <Link href="/dashboard/product-boxes">
              <Package className="h-4 w-4 mr-2" />
              Create Product Box
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Single column grid on all screen sizes for better mobile experience */}
      <div className="grid grid-cols-1 gap-4">
        {productBoxes.map((productBox) => (
          <Card
            key={productBox.id}
            className="bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50 transition-all duration-200"
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-24 h-24 bg-gray-700/50 rounded-lg overflow-hidden flex-shrink-0">
                  {productBox.thumbnailUrl ? (
                    <img
                      src={productBox.thumbnailUrl || "/placeholder.svg"}
                      alt={productBox.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white text-lg leading-tight">{productBox.title}</h3>
                    {!productBox.isActive && (
                      <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{productBox.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-white">
                        ${productBox.price.toFixed(2)} {productBox.currency.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">
                        {productBox.contentCount} item{productBox.contentCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwnProfile ? (
                        <>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-gray-600 hover:bg-gray-700 text-white bg-transparent"
                          >
                            <Link href={`/dashboard/product-boxes/${productBox.id}/edit`}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Link>
                          </Button>
                          <Button size="sm" className="bg-gray-700 hover:bg-gray-600 text-white">
                            Manage
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handlePurchase(productBox.id)}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={!productBox.isActive}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Purchase
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
