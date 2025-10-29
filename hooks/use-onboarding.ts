"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
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

  const autoDetectCompletedSteps = useCallback(async () => {
    if (!user || !progress) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) return

      const userData = userDoc.data()
      const stepsToComplete: string[] = []

      // Check setup_storefront: username and bio exist
      if (!progress.steps.setup_storefront.completed) {
        if (userData.username && userData.bio) {
          stepsToComplete.push("setup_storefront")
        }
      }

      // Check upload_content: has at least one piece of content (free or premium)
      if (!progress.steps.upload_content.completed) {
        const freeResponse = await fetch(`/api/creator/${user.uid}/free-content`)
        const premiumResponse = await fetch(`/api/creator/${user.uid}/premium-content`)

        if (freeResponse.ok && premiumResponse.ok) {
          const freeData = await freeResponse.json()
          const premiumData = await premiumResponse.json()

          if (freeData.content?.length > 0 || premiumData.content?.length > 0) {
            stepsToComplete.push("upload_content")
          }
        }
      }

      // Check add_free_content: has at least one free content item
      if (!progress.steps.add_free_content.completed) {
        const freeResponse = await fetch(`/api/creator/${user.uid}/free-content`)
        if (freeResponse.ok) {
          const freeData = await freeResponse.json()
          if (freeData.content?.length > 0) {
            stepsToComplete.push("add_free_content")
          }
        }
      }

      // Check setup_stripe: has Stripe account connected
      if (!progress.steps.setup_stripe.completed) {
        if (userData.stripeAccountId && userData.stripeOnboardingComplete) {
          stepsToComplete.push("setup_stripe")
        }
      }

      // Check create_bundle: has at least one premium bundle
      if (!progress.steps.create_bundle.completed) {
        const premiumResponse = await fetch(`/api/creator/${user.uid}/premium-content`)
        if (premiumResponse.ok) {
          const premiumData = await premiumResponse.json()
          if (premiumData.content?.length > 0) {
            stepsToComplete.push("create_bundle")
          }
        }
      }

      // Check go_live: storefront is active
      if (!progress.steps.go_live.completed) {
        if (userData.storefrontActive === true) {
          stepsToComplete.push("go_live")
        }
      }

      // Complete all detected steps
      for (const stepId of stepsToComplete) {
        await completeStep(stepId)
      }
    } catch (err) {
      console.error("[useOnboarding] Error auto-detecting steps:", err)
    }
  }, [user, progress])

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

  useEffect(() => {
    if (progress && !loading) {
      autoDetectCompletedSteps()
    }
  }, [progress, loading])

  return {
    progress,
    loading,
    error,
    completeStep,
    refetch: fetchProgress,
  }
}
