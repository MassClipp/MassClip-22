"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Settings, Save, Info, Lock } from "lucide-react"

interface PremiumPricingControlProps {
  creatorId: string
  username: string
  currentPrice?: number
  isOwner: boolean
}

export default function PremiumPricingControl({
  creatorId,
  username,
  currentPrice = 4.99,
  isOwner,
}: PremiumPricingControlProps) {
  const [price, setPrice] = useState(currentPrice.toString())
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSavePrice = async () => {
    // Validate price
    const numPrice = Number.parseFloat(price)
    if (isNaN(numPrice) || numPrice < 0.99 || numPrice > 99.99) {
      return
    }

    // Simulate saving
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setIsEditing(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }, 1000)
  }

  // If not the owner, just show the current price
  if (!isOwner) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium text-white">Premium Content</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-medium">{currentPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg text-white">Premium Content Pricing</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-medium">{currentPrice.toFixed(2)}</span>
          </div>
        </div>
        <CardDescription className="text-zinc-400">
          Set the price for all your premium content. Subscribers will pay this amount to access your premium videos.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {showSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>Price updated successfully!</span>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="price" className="text-sm text-zinc-300">
                Subscription Price (USD)
              </Label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <DollarSign className="h-4 w-4 text-zinc-500" />
                </div>
                <Input
                  id="price"
                  type="number"
                  min="0.99"
                  max="99.99"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-8 bg-zinc-800/50 border-zinc-700 focus:border-amber-500 text-white"
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">Minimum price: $0.99, Maximum price: $99.99</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-zinc-800/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Current subscription price</p>
                <p className="text-xl font-semibold text-white flex items-center">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  {currentPrice.toFixed(2)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Change Price
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {isEditing && (
        <CardFooter className="flex justify-end gap-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(false)
              setPrice(currentPrice.toString())
            }}
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSavePrice}
            disabled={isSaving}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Price
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
