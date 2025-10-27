"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface StorefrontToggleProps {
  userId: string
  initialEnabled: boolean
}

export function StorefrontToggle({ userId, initialEnabled }: StorefrontToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasActiveSubscription: boolean
    isOnTrial: boolean
    hasUsedFreeTrial: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/user/trial-status")
      if (response.ok) {
        const data = await response.json()
        setSubscriptionStatus({
          hasActiveSubscription: data.hasActiveCreatorPro || data.hasActiveCreatorVIP,
          isOnTrial: data.isOnTrial,
          hasUsedFreeTrial: data.hasUsedFreeTrial,
        })
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error)
    }
  }

  const handleToggle = async (checked: boolean) => {
    // Check if user can enable storefront
    if (checked && subscriptionStatus && !subscriptionStatus.hasActiveSubscription && !subscriptionStatus.isOnTrial) {
      setShowUpgradeModal(true)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/storefront/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      })

      if (response.ok) {
        setIsEnabled(checked)
      }
    } catch (error) {
      console.error("Error toggling storefront:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = () => {
    // Determine which checkout to use based on trial status
    if (subscriptionStatus?.hasUsedFreeTrial) {
      // User has already used trial, send to Starter plan
      router.push("/api/stripe/checkout/starter")
    } else {
      // User hasn't used trial, send to VIP trial
      router.push("/api/stripe/checkout/vip")
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Storefront Status</span>
          <span className="text-xs text-muted-foreground">{isEnabled ? "Live" : "Disabled"}</span>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} disabled={isLoading} id="storefront-toggle" />
      </div>

      {/* Glassmorphism upgrade modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "relative w-full max-w-md p-8 rounded-2xl",
                "bg-gradient-to-br from-white/10 to-white/5",
                "backdrop-blur-xl border border-white/20",
                "shadow-2xl",
              )}
            >
              {/* Close button */}
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Ready to go live?</h2>
                <p className="text-muted-foreground">Your audience is waiting to buy your content.</p>

                <button
                  onClick={handleUpgrade}
                  className={cn(
                    "w-full py-3 px-6 rounded-lg font-semibold",
                    "bg-gradient-to-r from-purple-500 to-pink-500",
                    "hover:from-purple-600 hover:to-pink-600",
                    "transition-all duration-200",
                    "text-white",
                  )}
                >
                  Go Live
                </button>

                <p className="text-xs text-muted-foreground">
                  {subscriptionStatus?.hasUsedFreeTrial ? "Start with the Starter plan" : "Start your free 7-day trial"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
