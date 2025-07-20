"use client"

import type React from "react"

import { useState } from "react"
import { Unlock, Settings } from "lucide-react"

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
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      )
    }

    if (!isLoggedIn) {
      return (
        <>
          <Unlock className="w-4 h-4" />
          <span>Unlock</span>
        </>
      )
    }

    if (isCreator) {
      return (
        <>
          <Settings className="w-4 h-4" />
          <span>Manage</span>
        </>
      )
    }

    return (
      <>
        <Unlock className="w-4 h-4" />
        <span>Unlock</span>
      </>
    )
  }

  const getButtonStyle = () => {
    if (isCreator) {
      return "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border border-blue-500 hover:border-blue-400"
    }
    return "bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-600 hover:border-zinc-500"
  }

  const isDisabled = disabled || isUnlocking

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-xs font-bold">!</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Login Required</span>
            <span className="text-xs opacity-90">You need to login to unlock this content</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`${getButtonStyle()} font-semibold px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer select-none`}
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
