"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, Loader2, Play, Download, Clock, User, DollarSign } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface ProductBoxDisplayProps {
  productBox: {
    id: string
    title: string
    description?: string
    price: number
    thumbnailUrl?: string
    creatorId: string
    creatorUsername?: string
    creatorName?: string
    contentCount?: number
    totalDuration?: number
    tags?: string[]
    createdAt?: Date
  }
  showPurchaseButton?: boolean
}

export default function ProductBoxDisplay({ productBox, showPurchaseButton = true }: ProductBoxDisplayProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a purchase.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("🛒 [Purchase] Starting checkout for product box:", productBox.id)

      const idToken = await user.getIdToken()
      console.log("🔑 [Purchase] Got auth token")

      console.log("📡 [Purchase] Creating checkout session...")
      const response = await fetch(`/api/creator/product-boxes/${productBox.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          idToken,
        }),
      })

      console.log("📡 [Purchase] Checkout response:", {
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Checkout failed" }))
        console.error("❌ [Purchase] Checkout error:", errorData)
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()
      console.log("✅ [Purchase] Checkout session created:", {
        sessionId: data.sessionId,
        hasCheckoutUrl: !!data.checkoutUrl,
      })

      if (data.checkoutUrl) {
        console.log("🔄 [Purchase] Redirecting to Stripe checkout...")
        window.location.href = data.checkoutUrl
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("❌ [Purchase] Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Purchase failed"

      toast({
        title: "Purchase Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Card className="w-full max-w-2xl bg-gray-800/90 border-gray-700 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-white mb-2">{productBox.title}</CardTitle>
            {productBox.description && (
              <p className="text-gray-400 text-sm leading-relaxed">{productBox.description}</p>
            )}
          </div>
          {productBox.thumbnailUrl && (
            <div className="ml-4 flex-shrink-0">
              <Image
                src={productBox.thumbnailUrl || "/placeholder.svg"}
                alt={productBox.title}
                width={120}
                height={80}
                className="rounded-lg object-cover border border-gray-600"
              />
            </div>
          )}
        </div>

        {/* Creator Info */}
        {(productBox.creatorUsername || productBox.creatorName) && (
          <div className="flex items-center gap-2 pt-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-400">
              by{" "}
              {productBox.creatorUsername ? (
                <Link
                  href={`/creator/${productBox.creatorUsername}`}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {productBox.creatorName || productBox.creatorUsername}
                </Link>
              ) : (
                <span className="text-gray-300">{productBox.creatorName}</span>
              )}
            </span>
          </div>
        )}

        {/* Tags */}
        {productBox.tags && productBox.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {productBox.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs bg-gray-700 text-gray-300 hover:bg-gray-600">
                {tag}
              </Badge>
            ))}
            {productBox.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                +{productBox.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="h-4 w-4 text-green-400" />
              <span className="text-lg font-semibold text-white">{formatPrice(productBox.price)}</span>
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Price</div>
          </div>

          {productBox.contentCount && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Play className="h-4 w-4 text-blue-400" />
                <span className="text-lg font-semibold text-white">{productBox.contentCount}</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Items</div>
            </div>
          )}

          {productBox.totalDuration && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-lg font-semibold text-white">{formatDuration(productBox.totalDuration)}</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Duration</div>
            </div>
          )}
        </div>

        {/* Purchase Button */}
        {showPurchaseButton && (
          <div className="space-y-3">
            <Button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Checkout...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase for {formatPrice(productBox.price)}
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-500">Secure payment powered by Stripe • Instant access after purchase</p>
            </div>
          </div>
        )}

        {/* Preview/Access Button for owned content */}
        {!showPurchaseButton && (
          <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
            <Link href={`/product-box/${productBox.id}/content`}>
              <Download className="h-4 w-4 mr-2" />
              Access Content
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
