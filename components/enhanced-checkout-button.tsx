"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-firebase-auth"
import { toast } from "@/hooks/use-toast"
import { Loader2, Lock, CreditCard } from 'lucide-react'

interface EnhancedCheckoutButtonProps {
  bundleId: string
  price: number
  title: string
  creatorId: string
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function EnhancedCheckoutButton({
  bundleId,
  price,
  title,
  creatorId,
  className,
  variant = "default",
  size = "default"
}: EnhancedCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user, loading: authLoading, signInWithGoogle } = useAuth()

  const handlePurchase = async () => {
    try {
      setIsLoading(true)
      console.log("🛒 [Checkout] Starting purchase flow for bundle:", bundleId)

      // Check if user is authenticated
      let currentUser = user
      if (!currentUser && !authLoading) {
        console.log("🔐 [Checkout] User not authenticated, prompting sign in")
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue with your purchase.",
        })
        
        try {
          currentUser = await signInWithGoogle()
          console.log("✅ [Checkout] User signed in successfully")
        } catch (authError) {
          console.error("❌ [Checkout] Authentication failed:", authError)
          toast({
            title: "Authentication Failed",
            description: "Unable to sign in. Please try again.",
            variant: "destructive",
          })
          return
        }
      }

      // Get ID token for authenticated requests
      let idToken = null
      if (currentUser) {
        try {
          idToken = await currentUser.getIdToken()
          console.log("🔑 [Checkout] Got ID token for user:", currentUser.uid)
        } catch (tokenError) {
          console.error("❌ [Checkout] Failed to get ID token:", tokenError)
          toast({
            title: "Authentication Error",
            description: "Unable to verify authentication. Please try signing in again.",
            variant: "destructive",
          })
          return
        }
      }

      // Debug bundle before checkout
      console.log("🔍 [Checkout] Debugging bundle configuration...")
      const debugResponse = await fetch(`/api/debug/checkout-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
        body: JSON.stringify({ bundleId }),
      })

      if (!debugResponse.ok) {
        const debugError = await debugResponse.text()
        console.error("❌ [Checkout] Bundle debug failed:", debugError)
        toast({
          title: "Configuration Error",
          description: "Bundle is not properly configured for checkout.",
          variant: "destructive",
        })
        return
      }

      const debugData = await debugResponse.json()
      console.log("✅ [Checkout] Bundle debug successful:", debugData)

      // Create checkout session
      console.log("💳 [Checkout] Creating Stripe checkout session...")
      const checkoutResponse = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
        body: JSON.stringify({
          bundleId,
          successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
          buyerEmail: currentUser?.email || undefined,
          buyerName: currentUser?.displayName || undefined,
        }),
      })

      if (!checkoutResponse.ok) {
        const errorText = await checkoutResponse.text()
        console.error("❌ [Checkout] Checkout session creation failed:", {
          status: checkoutResponse.status,
          statusText: checkoutResponse.statusText,
          error: errorText,
        })

        let errorMessage = "Failed to create checkout session"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          // Use default error message if parsing fails
        }

        toast({
          title: "Checkout Error",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      const { url } = await checkoutResponse.json()
      console.log("✅ [Checkout] Checkout session created, redirecting to:", url)

      // Redirect to Stripe checkout
      window.location.href = url

    } catch (error) {
      console.error("❌ [Checkout] Unexpected error:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = isLoading || authLoading

  return (
    <Button
      onClick={handlePurchase}
      disabled={isDisabled}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {user ? (
            <CreditCard className="mr-2 h-4 w-4" />
          ) : (
            <Lock className="mr-2 h-4 w-4" />
          )}
          {user ? `Buy for $${price.toFixed(2)}` : "Sign in & Buy"}
        </>
      )}
    </Button>
  )
}
