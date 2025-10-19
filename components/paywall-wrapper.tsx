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

  // Pages that are always accessible
  const alwaysAccessiblePaths = [
    "/dashboard/upgrade",
    "/dashboard/purchases",
    "/dashboard/profile",
    "/pricing",
    "/welcome",
  ]

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setLoading(false)
        setHasAccess(false)
        return
      }

      // Check if current path is always accessible
      const isAlwaysAccessible = alwaysAccessiblePaths.some((path) => pathname?.startsWith(path))
      if (isAlwaysAccessible) {
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

        // Check membership status
        const membershipRes = await fetch("/api/membership-status", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        const membershipData = await membershipRes.json()

        console.log("[v0] Paywall check:", {
          isOnTrial: trialData.isOnTrial,
          isActive: membershipData.isActive,
          status: membershipData.status,
        })

        // User has access if they're on trial OR have active subscription
        const userHasAccess = trialData.isOnTrial || (membershipData.isActive && membershipData.status === "active")

        setHasAccess(userHasAccess)
      } catch (error) {
        console.error("[v0] Error checking access:", error)
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
      <div className="relative min-h-[600px]">
        {/* Blurred content */}
        <div className="blur-md pointer-events-none select-none">{children}</div>

        {/* Paywall overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="max-w-md mx-auto text-center space-y-6 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700/50">
              <Lock className="h-8 w-8 text-zinc-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-light text-white">Subscription Required</h2>
              <p className="text-zinc-400">
                This feature is only accessible for creators with an active subscription or free trial.
              </p>
            </div>

            <Button
              onClick={() => router.push("/dashboard/upgrade")}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white"
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
