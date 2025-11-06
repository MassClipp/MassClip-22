"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface TrialStatus {
  isOnTrial: boolean
  daysRemaining: number
}

export default function TrialBadge() {
  const { user } = useAuth()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
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
        console.error("[TrialBadge] Error checking trial status:", error)
      } finally {
        setLoading(false)
      }
    }

    checkTrialStatus()
  }, [user])

  if (loading || !trialStatus || !trialStatus.isOnTrial) {
    return null
  }

  const { daysRemaining } = trialStatus
  const isExpiringSoon = daysRemaining <= 1

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        isExpiringSoon
          ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/30"
          : "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30"
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>
        {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
      </span>
    </div>
  )
}
