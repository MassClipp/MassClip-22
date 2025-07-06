"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Trash2, Eye, EyeOff } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import ProductBoxContentDisplay from "./product-box-content-display"

interface ProductBox {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  type: string
  coverImage: string | null
  contentItems: string[]
  productId: string | null
  priceId: string | null
  active: boolean
  createdAt: any
  updatedAt: any
  customPreviewThumbnail?: string | null
  customPreviewDescription?: string | null
}

interface ProductBoxDisplayProps {
  productBox: ProductBox
  onToggleActive: (productBox: ProductBox) => void
  onDelete: (productBox: ProductBox) => void
  onEditPreview: (productBox: ProductBox) => void
  onAddContent: (productBox: ProductBox) => void
  className?: string
}

export default function ProductBoxDisplay({
  productBox,
  onToggleActive,
  onDelete,
  onEditPreview,
  onAddContent,
  className = "",
}: ProductBoxDisplayProps) {
  const [showContent, setShowContent] = useState(true)

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  return (
    <Card
      className={`bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700/50 transition-all duration-300 ${className}`}
    >
      {/* Cover Image - Now in 9:16 aspect ratio */}
      {productBox.coverImage && (
        <div className="aspect-[9/16] bg-zinc-800 rounded-t-lg overflow-hidden">
          <img
            src={productBox.coverImage || "/placeholder.svg"}
            alt={productBox.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{productBox.title}</h3>
              {productBox.description && <p className="mt-1 text-sm text-zinc-400">{productBox.description}</p>}
            </div>
            <Badge variant={productBox.active ? "default" : "secondary"} className="text-xs">
              {productBox.active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-white">{formatPrice(productBox.price, productBox.currency)}</div>
            {productBox.type === "subscription" && (
              <Badge variant="outline" className="text-xs border-zinc-700">
                /month
              </Badge>
            )}
          </div>

          {/* Content Display - Now using the updated 9:16 grid layout */}
          <ProductBoxContentDisplay productBoxId={productBox.id} contentCount={productBox.contentItems?.length || 0} />

          {/* Add Content Button */}
          <div className="flex justify-center pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddContent(productBox)}
              className="text-xs border-zinc-700 hover:bg-zinc-800 bg-zinc-800/50"
            >
              + Add Content
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Switch
                checked={productBox.active}
                onCheckedChange={() => onToggleActive(productBox)}
                className="data-[state=checked]:bg-green-600"
              />
              <span className="text-sm text-zinc-400">
                {productBox.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditPreview(productBox)}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(productBox)}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
