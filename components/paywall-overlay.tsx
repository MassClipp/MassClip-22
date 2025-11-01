"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface PaywallOverlayProps {
  children: React.ReactNode
  allowPurchases?: boolean // If true, allows access to purchases page
}

export function PaywallOverlay({ children, allowPurchases = false }: PaywallOverlayProps) {
  const { user } = useFirebaseAuth()
  const router = useRouter()
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const token = await user.getIdToken()

        // Check trial status
        const trialResponse = await fetch("/api/user/trial-status", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const trialData = await trialResponse.json()

        // Check membership status
        const membershipResponse = await fetch("/api/user/membership", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const membershipData = await membershipResponse.json()

        console.log("[v0] Paywall check:", {
          isOnTrial: trialData.isOnTrial,
          hasActiveCreatorPro: trialData.hasActiveCreatorPro,
          membershipActive: membershipData.success && membershipData.data?.isActive,
        })

        // User has access if:
        // 1. They're on an active trial
        // 2. They have an active Creator Pro or Starter subscription
        const hasAccess =
          trialData.isOnTrial ||
          trialData.hasActiveCreatorPro ||
          (membershipData.success && membershipData.data?.isActive)

        setIsLocked(!hasAccess)
      } catch (error) {
        console.error("[v0] Error checking access:", error)
        setIsLocked(true)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If locked and not on purchases page (or purchases not allowed), show paywall
  if (isLocked && !allowPurchases) {
    return (
      <div className="relative min-h-screen">
        {/* Blurred content */}
        <div className="blur-md pointer-events-none select-none">{children}</div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="max-w-md mx-auto p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Membership Required</h2>
              <p className="text-muted-foreground">Ready to sell your content?</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => router.push("/dashboard/upgrade")} size="lg" className="w-full">
                Get Started for $3/month
              </Button>
              <p className="text-sm text-muted-foreground">
                Start with our affordable Starter Plan or try Creator VIP free for 3 days
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
