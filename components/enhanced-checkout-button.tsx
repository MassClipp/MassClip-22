"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ShoppingCart, AlertTriangle, ExternalLink, CreditCard } from 'lucide-react'
import { useAuth } from "@/hooks/use-firebase-auth"

interface BundleItem {
  id: string
  title: string
  price: number
  creatorId: string
  stripeProductId?: string
  stripePriceId?: string
}

interface EnhancedCheckoutButtonProps {
  bundle: BundleItem
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function EnhancedCheckoutButton({ 
  bundle, 
  className = "", 
  size = "default",
  variant = "destructive"
}: EnhancedCheckoutButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creatorAccountStatus, setCreatorAccountStatus] = useState<{
    connected: boolean
    fullySetup: boolean
    accountId?: string
  } | null>(null)

  const checkCreatorAccount = async () => {
    try {
      console.log(`🔍 Checking creator account status for: ${bundle.creatorId}`)
      
      const response = await fetch(`/api/stripe/connect/status?userId=${bundle.creatorId}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Creator account status:`, data)
        setCreatorAccountStatus(data)
        return data
      } else {
        console.log(`❌ Creator account not found or error`)
        setCreatorAccountStatus({
          connected: false,
          fullySetup: false
        })
        return {
          connected: false,
          fullySetup: false
        }
      }
    } catch (error) {
      console.error("❌ Error checking creator account:", error)
      setCreatorAccountStatus({
        connected: false,
        fullySetup: false
      })
      return {
        connected: false,
        fullySetup: false
      }
    }
  }

  const handlePurchase = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`🛒 [Unlock Button] Starting checkout for bundle:`, bundle)

      // Check if user is authenticated
      if (!user) {
        setError("Please log in to make a purchase")
        return
      }

      // Get user ID token for authentication
      const idToken = await user.getIdToken()
      console.log(`🔐 [Unlock Button] Got auth token for user: ${user.uid}`)

      // Check creator's account status first
      const creatorStatus = await checkCreatorAccount()
      
      if (!creatorStatus.connected || !creatorStatus.fullySetup) {
        setError("This creator hasn't finished setting up their payment account yet. Please try again later.")
        return
      }

      // Validate bundle has required Stripe IDs
      if (!bundle.stripeProductId || !bundle.stripePriceId) {
        setError("This item is not properly configured for purchase. Please contact the creator.")
        return
      }

      console.log(`🛒 [Unlock Button] Creating checkout session...`)

      // Create checkout session
      const checkoutResponse = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bundleId: bundle.id,
          creatorId: bundle.creatorId,
          buyerId: user.uid,
          buyerEmail: user.email,
          priceId: bundle.stripePriceId,
          productId: bundle.stripeProductId,
          amount: Math.round(bundle.price * 100), // Convert to cents
          currency: "usd",
          successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json()
        console.error(`❌ [Unlock Button] Checkout session creation failed:`, errorData)
        
        // Handle specific error types
        if (errorData.error?.includes("destination account")) {
          setError("The creator's payment account needs additional setup. Please try again later.")
        } else if (errorData.error?.includes("capabilities")) {
          setError("The creator's account is not yet enabled for payments. Please try again later.")
        } else {
          setError(errorData.error || "Failed to create checkout session")
        }
        return
      }

      const { sessionId, url } = await checkoutResponse.json()
      console.log(`✅ [Unlock Button] Checkout session created:`, sessionId)

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        setError("Failed to redirect to checkout")
      }

    } catch (error) {
      console.error(`❌ [Unlock Button] Purchase failed:`, error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Show creator account status if there's an issue
  if (creatorAccountStatus && (!creatorAccountStatus.connected || !creatorAccountStatus.fullySetup)) {
    return (
      <div className="space-y-2">
        <Button
          disabled
          variant="outline"
          size={size}
          className={`${className} opacity-50 cursor-not-allowed`}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Unavailable
        </Button>
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200 text-sm">
            This creator is still setting up their payment account. Check back soon!
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePurchase}
        disabled={loading}
        variant={variant}
        size={size}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Unlock ${bundle.price.toFixed(2)}
          </>
        )}
      </Button>

      {error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
