"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Crown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

interface TrialStatus {
  isOnTrial: boolean
  daysRemaining: number
  trialEndDate: Date | null
}

export function TrialStatusBanner() {
  const router = useRouter()
  const { user } = useAuth()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const idToken = await user.getIdToken()
        const res = await fetch("/api/user/trial-status", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          setTrialStatus(data)
        }
      } catch (error) {
        console.error("[TrialBanner] Error checking trial status:", error)
      } finally {
        setLoading(false)
      }
    }

    checkTrialStatus()
  }, [user])

  if (loading || !trialStatus || !trialStatus.isOnTrial || isDismissed) {
    return null
  }

  const { daysRemaining } = trialStatus
  const isExpiringSoon = daysRemaining <= 3

  return (
    <div
      className={`relative border-b ${
        isExpiringSoon
          ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-400/30"
          : "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-400/30"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isExpiringSoon ? (
              <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
            ) : (
              <Crown className="h-5 w-5 text-cyan-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm text-white">
                {isExpiringSoon ? (
                  <>
                    <span className="font-medium">Trial ending soon!</span> You have {daysRemaining} day
                    {daysRemaining !== 1 ? "s" : ""} left of Creator Pro.
                  </>
                ) : (
                  <>
                    <span className="font-medium">You're on a free trial!</span> {daysRemaining} days remaining of
                    Creator Pro.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/dashboard/upgrade")}
              size="sm"
              className={`${
                isExpiringSoon
                  ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400"
                  : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
              } text-white`}
            >
              Subscribe Now
            </Button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
