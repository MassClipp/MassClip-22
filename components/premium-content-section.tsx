"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Eye, ShoppingCart, Clock, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  thumbnailUrl?: string
  totalItems: number
  createdAt: string
}

interface PremiumContentSectionProps {
  creatorId: string
  creatorUsername: string
}

export default function PremiumContentSection({ creatorId, creatorUsername }: PremiumContentSectionProps) {
  const router = useRouter()
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
        throw new Error("Failed to load premium content")
      }

      const data = await response.json()

      if (data.success) {
        setProductBoxes(data.productBoxes || [])
      } else {
        setError(data.error || "Failed to load premium content")
      }
    } catch (error) {
      console.error("Error fetching product boxes:", error)
      setError("Failed to load premium content")
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (productBoxId: string) => {
    router.push(`/product-box/${productBoxId}/preview`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse">
            <CardContent className="p-4">
              <div className="aspect-video bg-zinc-800 rounded-lg mb-4"></div>
              <div className="h-4 bg-zinc-800 rounded mb-2"></div>
              <div className="h-3 bg-zinc-800 rounded w-2/3 mb-4"></div>
              <div className="h-8 bg-zinc-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={fetchProductBoxes} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    )
  }

  if (productBoxes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-zinc-400 mb-2">No Premium Content</h3>
        <p className="text-zinc-500">@{creatorUsername} hasn't created any premium content yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {productBoxes.map((productBox) => (
        <Card key={productBox.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
          <CardContent className="p-0">
            {/* Thumbnail */}
            <div className="aspect-video bg-zinc-800 rounded-t-lg overflow-hidden relative">
              {productBox.thumbnailUrl ? (
                <img
                  src={productBox.thumbnailUrl || "/placeholder.svg"}
                  alt={productBox.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="h-12 w-12 text-zinc-600" />
                </div>
              )}

              {/* Price badge */}
              <div className="absolute top-3 right-3">
                <Badge className="bg-white text-black font-semibold">${productBox.price}</Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-white mb-2 line-clamp-2">{productBox.title}</h3>

              <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{productBox.totalItems} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(productBox.createdAt)}</span>
                </div>
              </div>

              {productBox.description && (
                <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{productBox.description}</p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePreview(productBox.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  onClick={() => handlePreview(productBox.id)}
                  size="sm"
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />${productBox.price}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
