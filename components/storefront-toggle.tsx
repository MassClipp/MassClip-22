"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function StorefrontToggle() {
  const { user } = useAuth()
  const router = useRouter()
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasActiveSubscription: boolean
    hasUsedFreeTrial: boolean
    canEnableStore: boolean
  } | null>(null)

  useEffect(() => {
    async function loadStorefrontStatus() {
      if (!user) return

      try {
        const response = await fetch("/api/storefront/status")
        const data = await response.json()

        setIsEnabled(data.isEnabled)
        setSubscriptionStatus({
          hasActiveSubscription: data.hasActiveSubscription,
          hasUsedFreeTrial: data.hasUsedFreeTrial,
          canEnableStore: data.canEnableStore,
        })
      } catch (error) {
        console.error("[v0] Error loading storefront status:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStorefrontStatus()
  }, [user])

  const handleToggle = async (checked: boolean) => {
    if (!user || !subscriptionStatus) return

    // If trying to enable but can't
    if (checked && !subscriptionStatus.canEnableStore) {
      setShowUpgradeModal(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/storefront/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      })

      const data = await response.json()

      if (data.success) {
        setIsEnabled(checked)
      }
    } catch (error) {
      console.error("[v0] Error toggling storefront:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    if (!subscriptionStatus) return

    // If they've used free trial, go to starter plan
    if (subscriptionStatus.hasUsedFreeTrial) {
      router.push("/dashboard/upgrade?plan=starter")
    } else {
      // Otherwise go to VIP checkout (free trial)
      router.push("/welcome/free-trial")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-background/50 backdrop-blur-sm border border-border rounded-lg">
        <span className="text-sm font-medium">Store Status</span>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} disabled={loading} />
        <span className={`text-xs font-medium ${isEnabled ? "text-green-500" : "text-muted-foreground"}`}>
          {isEnabled ? "Live" : "Offline"}
        </span>
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background/80 backdrop-blur-xl border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
              }}
            >
              <h2 className="text-2xl font-bold mb-2">Ready to go live?</h2>
              <p className="text-muted-foreground mb-6">Your audience is waiting to buy your content.</p>

              <div className="space-y-3">
                <Button
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  size="lg"
                >
                  Go Live
                </Button>
                <Button onClick={() => setShowUpgradeModal(false)} variant="ghost" className="w-full">
                  Maybe Later
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
