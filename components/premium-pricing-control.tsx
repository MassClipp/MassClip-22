"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  Settings,
  Save,
  Info,
  Lock,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react"
import { db, auth } from "@/lib/firebase"
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore"
import { useSearchParams } from "next/navigation"

interface PremiumPricingControlProps {
  creatorId: string
  username: string
  isOwner: boolean
}

export default function PremiumPricingControl({ creatorId, username, isOwner }: PremiumPricingControlProps) {
  const [price, setPrice] = useState("4.99")
  const [currentPrice, setCurrentPrice] = useState(4.99)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isConnectingStripe, setIsConnectingStripe] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeStatus, setStripeStatus] = useState({
    isConnected: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    onboardingComplete: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  const searchParams = useSearchParams()

  // Check for Stripe success/retry params
  useEffect(() => {
    const success = searchParams.get("success")
    const retry = searchParams.get("retry")

    if ((success === "stripe" || retry === "stripe") && isOwner) {
      // User returned from Stripe onboarding, check their status
      setTimeout(() => {
        checkStripeStatus()
      }, 1000) // Small delay to ensure Stripe has processed the update
    }
  }, [searchParams, isOwner])

  // Real-time listener for Stripe status updates
  useEffect(() => {
    if (!creatorId) return

    const userDocRef = doc(db, "users", creatorId)
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()

          // Update premium price
          if (data.premiumPrice) {
            setCurrentPrice(data.premiumPrice)
            setPrice(data.premiumPrice.toString())
          }

          // Update Stripe status
          setStripeStatus({
            isConnected: !!data.stripeAccountId,
            chargesEnabled: data.chargesEnabled || false,
            payoutsEnabled: data.payoutsEnabled || false,
            onboardingComplete: data.stripeOnboardingComplete || false,
          })
        }
        setIsLoading(false)
      },
      (error) => {
        console.error("Error listening to user data:", error)
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [creatorId])

  const checkStripeStatus = async () => {
    try {
      setIsCheckingStatus(true)
      setError(null)

      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      const idToken = await currentUser.getIdToken()

      // Get the user's Stripe account ID from Firestore
      const userDocRef = doc(db, "users", creatorId)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists() || !userDoc.data().stripeAccountId) {
        throw new Error("No Stripe account found. Please connect your Stripe account first.")
      }

      const stripeAccountId = userDoc.data().stripeAccountId

      // Call the API to check Stripe account status
      const response = await fetch("/api/stripe/check-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          stripeAccountId,
        }),
      })

      const responseText = await response.text()
      console.log("Response status:", response.status)
      console.log("Response text:", responseText)

      if (!response.ok) {
        throw new Error(`Failed to check Stripe status: ${response.status} ${response.statusText}`)
      }

      const data = JSON.parse(responseText)
      console.log("Stripe status response:", data)

      if (data.success) {
        // Update local state
        setStripeStatus({
          isConnected: true,
          chargesEnabled: data.chargesEnabled || false,
          payoutsEnabled: data.payoutsEnabled || false,
          onboardingComplete: data.onboardingComplete || false,
        })

        // Show success message if onboarding is complete
        if (data.onboardingComplete && !stripeStatus.onboardingComplete) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 5000)
        }
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
      setError(error instanceof Error ? error.message : "Failed to check Stripe status. Please try again.")
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      setIsConnectingStripe(true)
      setError(null)

      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      const idToken = await currentUser.getIdToken()

      const response = await fetch("/api/stripe/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to connect Stripe account")
      }

      const data = await response.json()
      window.location.href = data.url
    } catch (error) {
      console.error("Error connecting Stripe:", error)
      setError("Failed to connect Stripe. Please try again.")
      setIsConnectingStripe(false)
    }
  }

  const handleSavePrice = async () => {
    const numPrice = Number.parseFloat(price)
    if (isNaN(numPrice) || numPrice < 0.99 || numPrice > 99.99) {
      setError("Price must be between $0.99 and $99.99")
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      const userDocRef = doc(db, "users", creatorId)
      await updateDoc(userDocRef, {
        premiumPrice: numPrice,
        premiumPriceUpdatedAt: new Date(),
      })

      setCurrentPrice(numPrice)
      setIsEditing(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving price:", error)
      setError("Failed to save price. Please try again.")
    } finally {
      setIsSaving(false)
    }
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

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg text-white">Premium Content Pricing</CardTitle>
          </div>
          <div className="animate-pulse bg-zinc-800 h-4 w-3/4 rounded mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-zinc-800 h-12 w-full rounded mb-4"></div>
          <div className="animate-pulse bg-zinc-800 h-8 w-1/2 rounded"></div>
        </CardContent>
      </Card>
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
        {/* Stripe Connection Status */}
        {stripeStatus.isConnected ? (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-400 mb-1">Stripe Connected</p>
                <div className="text-sm text-zinc-400 space-y-1">
                  <div className="flex items-center gap-2">
                    {stripeStatus.chargesEnabled ? (
                      <CheckCircle className="h-3 w-3 text-green-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span>Charges: {stripeStatus.chargesEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {stripeStatus.payoutsEnabled ? (
                      <CheckCircle className="h-3 w-3 text-green-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span>Payouts: {stripeStatus.payoutsEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
                {!stripeStatus.onboardingComplete && (
                  <p className="text-xs text-amber-400 mt-2">Complete your Stripe setup to start receiving payments.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Connect Stripe to receive payments</p>
              <p className="text-zinc-400">
                You need to connect your Stripe account before you can receive payments for your premium content.
              </p>
              <Button
                className="mt-2 bg-amber-500 hover:bg-amber-600 text-white"
                size="sm"
                onClick={handleConnectStripe}
                disabled={isConnectingStripe}
              >
                {isConnectingStripe ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Stripe Account
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Status Check Button */}
        {stripeStatus.isConnected && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={checkStripeStatus}
              disabled={isCheckingStatus}
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
            >
              {isCheckingStatus ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </>
              )}
            </Button>
          </div>
        )}

        {showSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>
              {stripeStatus.onboardingComplete ? "Stripe setup completed successfully!" : "Price updated successfully!"}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Price Setting (only show if Stripe is connected) */}
        {stripeStatus.isConnected && (
          <>
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
                    disabled={!stripeStatus.onboardingComplete}
                    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white disabled:opacity-50"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Change Price
                  </Button>
                </div>
              </div>
            )}
          </>
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
              setError(null)
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
