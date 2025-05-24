"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Lock, Save, Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PremiumPricingControlProps {
  creatorId: string
  username: string
  isOwner: boolean
}

export default function PremiumPricingControl({ creatorId, username, isOwner }: PremiumPricingControlProps) {
  const { toast } = useToast()
  const [price, setPrice] = useState("4.99")
  const [originalPrice, setOriginalPrice] = useState("4.99")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setIsLoading(true)
        const userDoc = await getDoc(doc(db, "users", creatorId))

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const currentPrice = userData.premiumPrice || 4.99
          setPrice(currentPrice.toString())
          setOriginalPrice(currentPrice.toString())
          setStripeConnected(!!userData.stripeAccountId && userData.stripeOnboardingComplete)
        }
      } catch (error) {
        console.error("Error fetching pricing:", error)
        toast({
          title: "Error",
          description: "Failed to load pricing information",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPricing()
  }, [creatorId])

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers and one decimal point
    if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
      setPrice(value)
    }
  }

  const handleSave = async () => {
    const numericPrice = Number.parseFloat(price)

    if (isNaN(numericPrice) || numericPrice < 0.99) {
      toast({
        title: "Invalid price",
        description: "Price must be at least $0.99",
        variant: "destructive",
      })
      return
    }

    if (numericPrice > 999.99) {
      toast({
        title: "Invalid price",
        description: "Price cannot exceed $999.99",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      await updateDoc(doc(db, "users", creatorId), {
        premiumPrice: numericPrice,
        updatedAt: new Date(),
      })

      setOriginalPrice(price)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      toast({
        title: "Price updated",
        description: `Premium content price set to $${numericPrice.toFixed(2)}`,
      })
    } catch (error) {
      console.error("Error updating price:", error)
      toast({
        title: "Error",
        description: "Failed to update price. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOwner) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            Premium Content
          </CardTitle>
          <CardDescription>Subscribe to access all premium videos from this creator</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
            <div>
              <p className="text-sm text-zinc-400">Current subscription price</p>
              <p className="text-2xl font-bold text-white flex items-center">
                <DollarSign className="h-5 w-5 text-green-500" />
                {originalPrice}
              </p>
            </div>
            <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black">
              Subscribe Now
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-500" />
          Premium Content Pricing
        </CardTitle>
        <CardDescription>
          Set the price for all your premium content. Subscribers will pay this amount to access your premium videos.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {stripeConnected ? (
          <>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-400">Stripe Connected</p>
                  <div className="text-sm text-zinc-400 mt-1">
                    <p>✓ Charges: Enabled</p>
                    <p>✓ Payouts: Enabled</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="price" className="text-white">
                  Subscription Price (USD)
                </Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="price"
                    type="text"
                    value={price}
                    onChange={handlePriceChange}
                    className="pl-9 bg-zinc-800/50 border-zinc-700 focus:border-amber-500 text-white text-lg"
                    placeholder="4.99"
                    disabled={isLoading || isSaving}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">Minimum: $0.99 • Maximum: $999.99</p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="text-sm text-zinc-400">Current price</p>
                  <p className="text-xl font-bold text-white">${originalPrice}</p>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={price === originalPrice || isSaving || isLoading}
                  className={
                    saveSuccess
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Change Price
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-zinc-400 mb-4">Connect your Stripe account to enable premium content</p>
            <Button
              onClick={() => (window.location.href = "/dashboard/earnings")}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Connect Stripe
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
