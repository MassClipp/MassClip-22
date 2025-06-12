"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Package, Plus, DollarSign, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import PremiumContentPurchaseButton, { LockedContentButton } from "./premium-content-purchase-button"

interface StripeProduct {
  id: string
  name: string
  description: string | null
  active: boolean
  default_price: {
    id: string
    unit_amount: number
    currency: string
    recurring: {
      interval: string
    } | null
  }
}

interface PremiumPricingControlProps {
  creatorId: string
  username?: string
  isOwner: boolean
}

export default function PremiumPricingControl({ creatorId, username, isOwner }: PremiumPricingControlProps) {
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/stripe/products?creatorId=${creatorId}`)

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      } else {
        // If not the owner or no products, just set empty array
        setProducts([])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [creatorId])

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  // Owner view - can manage products
  if (isOwner) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                Premium Content Pricing
              </CardTitle>
              <CardDescription>Manage your premium content products and pricing</CardDescription>
            </div>
            <Button
              onClick={() => router.push("/dashboard/pricing")}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Manage Products
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Premium Products</h3>
              <p className="text-zinc-400 mb-4">Create premium content products to start monetizing your content.</p>
              <Button
                onClick={() => router.push("/dashboard/pricing")}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Product
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.slice(0, 4).map((product) => (
                  <div key={product.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white">{product.name}</h4>
                      <Badge variant={product.active ? "default" : "secondary"} className="text-xs">
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {product.description && (
                      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{product.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-lg font-bold text-white">
                        <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                        {formatPrice(product.default_price.unit_amount, product.default_price.currency)}
                      </div>
                      {product.default_price.recurring && (
                        <Badge variant="outline" className="text-xs border-zinc-600">
                          /{product.default_price.recurring.interval}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {products.length > 4 && (
                <div className="text-center pt-4 border-t border-zinc-800">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/pricing")}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    View All {products.length} Products
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Visitor view - can purchase products
  if (products.length === 0) {
    return (
      <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Premium Content Available</h3>
          <p className="text-zinc-400">This creator hasn't set up premium content yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-amber-500" />
          Premium Content Access
        </CardTitle>
        <CardDescription>Purchase access to exclusive premium content</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products
            .filter((p) => p.active)
            .map((product) => (
              <div
                key={product.id}
                className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors"
              >
                <div className="mb-4">
                  <h4 className="font-medium text-white mb-2">{product.name}</h4>
                  {product.description && <p className="text-sm text-zinc-400 mb-4">{product.description}</p>}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-2xl font-bold text-white">
                    <DollarSign className="h-5 w-5 text-green-500 mr-1" />
                    {formatPrice(product.default_price.unit_amount, product.default_price.currency)}
                  </div>
                  {product.default_price.recurring && (
                    <Badge variant="outline" className="text-xs border-zinc-600">
                      /{product.default_price.recurring.interval}
                    </Badge>
                  )}
                </div>

                <PremiumContentPurchaseButton
                  creatorId={creatorId}
                  priceId={product.default_price.id}
                  productName={product.name}
                  price={product.default_price.unit_amount}
                  currency={product.default_price.currency}
                  creatorUsername={username}
                  className="w-full"
                />
              </div>
            ))}
        </div>

        {products.filter((p) => p.active).length === 0 && (
          <div className="text-center py-8">
            <LockedContentButton className="mx-auto" />
            <p className="text-zinc-400 mt-2 text-sm">Premium content is currently unavailable</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
