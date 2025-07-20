"use client"

import type React from "react"

import { useState } from "react"
import { Unlock } from "lucide-react"

interface UnlockButtonProps {
  stripePriceId?: string
  bundleId: string
  user: any
  disabled?: boolean
}

export function UnlockButton({ stripePriceId, bundleId, user, disabled = false }: UnlockButtonProps) {
  const [isUnlocking, setIsUnlocking] = useState(false)

  const handleUnlock = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    console.log("🔓 UnlockButton clicked for bundle:", bundleId)

    if (!stripePriceId) {
      console.error("❌ No Stripe price ID available for this bundle")
      alert("This bundle is not available for purchase at the moment.")
      return
    }

    if (disabled || isUnlocking) {
      console.log("⏸️ Button is disabled or already processing")
      return
    }

    setIsUnlocking(true)

    try {
      let idToken = null

      // Get Firebase ID token if user is authenticated
      if (user) {
        try {
          idToken = await user.getIdToken()
          console.log("✅ Got Firebase ID token for checkout")
        } catch (error) {
          console.error("❌ Failed to get ID token:", error)
        }
      }

      console.log("💳 Creating checkout session with:", {
        priceId: stripePriceId,
        bundleId: bundleId,
        hasIdToken: !!idToken,
      })

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          priceId: stripePriceId,
          bundleId: bundleId,
          successUrl: `${window.location.origin}/purchase-success?bundle_id=${bundleId}`,
          cancelUrl: window.location.href,
        }),
      })

      console.log("📡 Checkout API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Checkout session creation failed:", errorData)
        alert(`Failed to create checkout session: ${errorData.error}`)
        return
      }

      const { url } = await response.json()
      console.log("✅ Checkout session created, URL:", url)

      if (url) {
        console.log("🚀 Redirecting to Stripe checkout:", url)
        window.location.href = url
      } else {
        console.error("❌ No checkout URL received")
        alert("Failed to create checkout session")
      }
    } catch (error) {
      console.error("❌ Error creating checkout session:", error)
      alert("An error occurred while creating the checkout session")
    } finally {
      setIsUnlocking(false)
    }
  }

  const isDisabled = disabled || isUnlocking || !stripePriceId

  return (
    <button
      type="button"
      onClick={handleUnlock}
      disabled={isDisabled}
      className="bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-600 hover:border-zinc-500 font-semibold px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer select-none"
      style={{
        pointerEvents: isDisabled ? "none" : "auto",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
      aria-label={`Unlock bundle ${bundleId}`}
    >
      {isUnlocking ? (
        <>
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
          <span>Unlocking...</span>
        </>
      ) : (
        <>
          <Unlock className="w-4 h-4" />
          <span>Unlock</span>
        </>
      )}
    </button>
  )
}
