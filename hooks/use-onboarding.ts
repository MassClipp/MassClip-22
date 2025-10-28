"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import type { OnboardingProgress } from "@/app/api/user/onboarding-progress/route"

export function useOnboarding() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/onboarding-progress", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch onboarding progress")
      }

      const data = await response.json()
      setProgress(data)
    } catch (err) {
      console.error("[useOnboarding] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load onboarding")
    } finally {
      setLoading(false)
    }
  }, [user])

  const completeStep = useCallback(
    async (stepId: string) => {
      if (!user) return

      try {
        const idToken = await user.getIdToken()
        const response = await fetch("/api/user/onboarding-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ stepId }),
        })

        if (!response.ok) {
          throw new Error("Failed to complete step")
        }

        const data = await response.json()
        setProgress(data)
        return data
      } catch (err) {
        console.error("[useOnboarding] Error completing step:", err)
        throw err
      }
    },
    [user],
  )

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    loading,
    error,
    completeStep,
    refetch: fetchProgress,
  }
}
