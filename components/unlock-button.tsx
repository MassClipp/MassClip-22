"use client"

import type React from "react"

import { useState } from "react"
import { Unlock, Settings, Loader2 } from "lucide-react"

interface UnlockButtonProps {
  stripePriceId?: string
  bundleId: string
  user: any
  creatorId: string
  disabled?: boolean
}

export function UnlockButton({ stripePriceId, bundleId, user, creatorId, disabled = false }: UnlockButtonProps) {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const showLoginToast = () => {
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  const isCreator = user && user.uid === creatorId
  const isLoggedIn = !!user

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    console.log("🔓 Button clicked for bundle:", bundleId, {
      isLoggedIn,
      isCreator,
      userId: user?.uid,
      creatorId,
      stripePriceId,
    })

    // Case 1: No user logged in - show login toast
    if (!isLoggedIn) {
      console.log("❌ No user logged in, showing login toast")
      showLoginToast()
      return
    }

    // Case 2: Creator is logged in - redirect to manage bundle
    if (isCreator) {
      console.log("👤 Creator logged in, redirecting to manage bundle")
      window.location.href = `/dashboard/bundles?bundle=${bundleId}`
      return
    }

    // Case 3: Visitor is logged in - proceed with unlock/purchase
    console.log("🛒 Visitor logged in, proceeding with purchase")

    if (!stripePriceId) {
      console.error("❌ No Stripe price ID available for this bundle")
      alert("This bundle is not available for purchase at the moment. The creator needs to set up Stripe integration.")
      return
    }

    if (disabled || isUnlocking) {
      console.log("⏸️ Button is disabled or already processing")
      return
    }

    setIsUnlocking(true)

    try {
      let idToken = null

      // Get Firebase ID token
      try {
        idToken = await user.getIdToken()
        console.log("✅ Got Firebase ID token for checkout")
      } catch (error) {
        console.error("❌ Failed to get ID token:", error)
        alert("Authentication error. Please try logging in again.")
        return
      }

      console.log("💳 Creating checkout session with:", {
        priceId: stripePriceId,
        bundleId: bundleId,
        hasIdToken: !!idToken,
      })

      // Create Stripe checkout session
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

  const getButtonContent = () => {
    if (isUnlocking) {
      return (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing...</span>
        </>
      )
    }

    if (!isLoggedIn) {
      return (
        <>
          <Unlock className="w-3.5 h-3.5" />
          <span>Unlock</span>
        </>
      )
    }

    if (isCreator) {
      return (
        <>
          <Settings className="w-3.5 h-3.5" />
          <span>Manage</span>
        </>
      )
    }

    return (
      <>
        <Unlock className="w-3.5 h-3.5" />
        <span>Unlock</span>
      </>
    )
  }

  const getButtonStyle = () => {
    if (isCreator) {
      return "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 border border-blue-500/20 hover:border-blue-400/30 shadow-lg hover:shadow-blue-500/25"
    }
    return "bg-gradient-to-r from-zinc-800 to-zinc-900 text-white hover:from-zinc-700 hover:to-zinc-800 active:from-zinc-600 active:to-zinc-700 border border-zinc-600/30 hover:border-zinc-500/40 shadow-lg hover:shadow-zinc-500/20"
  }

  const isDisabled = disabled || isUnlocking

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 border border-red-500/20">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold">!</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Login Required</span>
            <span className="text-xs opacity-90">You need to login to unlock this content</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`${getButtonStyle()} font-medium px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer select-none hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm`}
        style={{
          pointerEvents: isDisabled ? "none" : "auto",
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
        aria-label={
          !isLoggedIn
            ? "Login required to unlock"
            : isCreator
              ? `Manage bundle ${bundleId}`
              : `Unlock bundle ${bundleId}`
        }
      >
        {getButtonContent()}
      </button>
    </>
  )
}
