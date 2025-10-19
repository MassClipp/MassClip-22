"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaywallWrapperProps {
  children: React.ReactNode
}

export function PaywallWrapper({ children }: PaywallWrapperProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const alwaysAccessiblePaths = ["/dashboard/upgrade", "/dashboard/purchases", "/pricing", "/welcome"]

  useEffect(() => {
    const checkAccess = async () => {
      console.log("[v0] PaywallWrapper: Starting access check for path:", pathname)

      if (!user) {
        console.log("[v0] PaywallWrapper: No user found, denying access")
        setLoading(false)
        setHasAccess(false)
        return
      }

      // Check if current path is always accessible
      const isAlwaysAccessible = alwaysAccessiblePaths.some((path) => pathname?.startsWith(path))
      if (isAlwaysAccessible) {
        console.log("[v0] PaywallWrapper: Path is always accessible:", pathname)
        setHasAccess(true)
        setLoading(false)
        return
      }

      try {
        const idToken = await user.getIdToken()

        // Check trial status
        const trialRes = await fetch("/api/user/trial-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const trialData = await trialRes.json()
        console.log("[v0] PaywallWrapper: Trial status:", trialData)

        // Check membership status
        const membershipRes = await fetch("/api/membership-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const membershipData = await membershipRes.json()
        console.log("[v0] PaywallWrapper: Membership status:", membershipData)

        const userHasAccess = trialData.isOnTrial || membershipData.isActive

        console.log("[v0] PaywallWrapper: Final access decision:", {
          isOnTrial: trialData.isOnTrial,
          isActive: membershipData.isActive,
          finalAccess: userHasAccess,
        })

        setHasAccess(userHasAccess)
      } catch (error) {
        console.error("[v0] PaywallWrapper: Error checking access:", error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [user, pathname])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    )
  }

  // Show paywall if no access
  if (!hasAccess) {
    return (
      <div className="fixed inset-0 z-40 overflow-hidden">
        {/* Blurred content - positioned absolutely to fill the viewport */}
        <div className="absolute inset-0 blur-md pointer-events-none select-none overflow-hidden">{children}</div>

        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="max-w-md mx-auto text-center space-y-6 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700/50">
              <Lock className="h-8 w-8 text-zinc-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Subscription Required</h2>
              <p className="text-zinc-400">
                This feature is only accessible for creators with an active subscription or free trial.
              </p>
            </div>

            <Button
              onClick={() => router.push("/dashboard/upgrade")}
              className="bg-white text-black hover:bg-zinc-100 font-medium"
            >
              View Plans
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // User has access, show content normally
  return <>{children}</>
}
