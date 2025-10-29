"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  completedAt?: Date
}

export interface OnboardingProgress {
  steps: OnboardingStep[]
  currentStep: string
  completedSteps: string[]
  isComplete: boolean
}

export function useOnboarding() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const attemptedSteps = useRef<Set<string>>(new Set())

  const fetchProgress = useCallback(async () => {
    if (!user) {
      console.log("[v0] useOnboarding - No user, skipping fetch")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] useOnboarding - Fetching progress for user:", user.uid)
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
      console.log("[v0] useOnboarding - Progress data received:", {
        isComplete: data.isComplete,
        completedSteps: data.completedSteps,
        currentStep: data.currentStep,
        totalSteps: data.steps?.length,
      })
      setProgress(data)
    } catch (err) {
      console.error("[v0] useOnboarding - Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load onboarding")
    } finally {
      setLoading(false)
    }
  }, [user])

  const completeStep = useCallback(
    async (stepId: string) => {
      if (!user) return

      try {
        console.log("[v0] useOnboarding - Completing step:", stepId)
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
        console.log("[v0] useOnboarding - Step completed, new progress:", data)
        setProgress(data)
        attemptedSteps.current.add(stepId)
        return data
      } catch (err) {
        console.error("[v0] useOnboarding - Error completing step:", err)
        throw err
      }
    },
    [user],
  )

  const autoDetectCompletedSteps = useCallback(async () => {
    if (!user || !progress) {
      console.log("[v0] useOnboarding - Skipping auto-detect: no user or progress")
      return
    }

    console.log("[v0] useOnboarding - Running auto-detection")

    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        console.log("[v0] useOnboarding - User document doesn't exist")
        return
      }

      const userData = userDoc.data()
      console.log("[v0] useOnboarding - User data:", {
        username: userData.username,
        bio: userData.bio,
        stripeAccountId: userData.stripeAccountId,
        storefrontActive: userData.storefrontActive,
      })

      const stepsToComplete: string[] = []

      const setupStorefrontStep = progress.steps.find((s) => s.id === "setup_storefront")
      if (setupStorefrontStep && !setupStorefrontStep.completed && !attemptedSteps.current.has("setup_storefront")) {
        if (userData.username && userData.bio) {
          console.log("[v0] useOnboarding - setup_storefront conditions met")
          stepsToComplete.push("setup_storefront")
        }
      }

      const uploadContentStep = progress.steps.find((s) => s.id === "upload_content")
      if (uploadContentStep && !uploadContentStep.completed && !attemptedSteps.current.has("upload_content")) {
        const freeContentQuery = query(collection(db, "free_content"), where("uid", "==", user.uid))
        const freeContentSnapshot = await getDocs(freeContentQuery)

        const productBoxesQuery = query(collection(db, "productBoxes"), where("creatorId", "==", user.uid))
        const productBoxesSnapshot = await getDocs(productBoxesQuery)

        if (!freeContentSnapshot.empty || !productBoxesSnapshot.empty) {
          console.log("[v0] useOnboarding - upload_content conditions met")
          stepsToComplete.push("upload_content")
        }
      }

      const addFreeContentStep = progress.steps.find((s) => s.id === "add_free_content")
      if (addFreeContentStep && !addFreeContentStep.completed && !attemptedSteps.current.has("add_free_content")) {
        const freeContentQuery = query(collection(db, "free_content"), where("uid", "==", user.uid))
        const freeContentSnapshot = await getDocs(freeContentQuery)

        if (!freeContentSnapshot.empty) {
          console.log("[v0] useOnboarding - add_free_content conditions met")
          stepsToComplete.push("add_free_content")
        }
      }

      const setupStripeStep = progress.steps.find((s) => s.id === "setup_stripe")
      if (setupStripeStep && !setupStripeStep.completed && !attemptedSteps.current.has("setup_stripe")) {
        if (userData.stripeAccountId && userData.stripeOnboardingComplete) {
          console.log("[v0] useOnboarding - setup_stripe conditions met")
          stepsToComplete.push("setup_stripe")
        }
      }

      const createBundleStep = progress.steps.find((s) => s.id === "create_bundle")
      if (createBundleStep && !createBundleStep.completed && !attemptedSteps.current.has("create_bundle")) {
        const productBoxesQuery = query(collection(db, "productBoxes"), where("creatorId", "==", user.uid))
        const productBoxesSnapshot = await getDocs(productBoxesQuery)

        if (!productBoxesSnapshot.empty) {
          console.log("[v0] useOnboarding - create_bundle conditions met")
          stepsToComplete.push("create_bundle")
        }
      }

      const goLiveStep = progress.steps.find((s) => s.id === "go_live")
      if (goLiveStep && !goLiveStep.completed && !attemptedSteps.current.has("go_live")) {
        if (userData.storefrontActive === true) {
          console.log("[v0] useOnboarding - go_live conditions met")
          stepsToComplete.push("go_live")
        }
      }

      console.log("[v0] useOnboarding - Steps to complete:", stepsToComplete)
      for (const stepId of stepsToComplete) {
        await completeStep(stepId)
      }
    } catch (err) {
      console.error("[v0] useOnboarding - Error auto-detecting steps:", err)
    }
  }, [user, progress, completeStep])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  useEffect(() => {
    if (progress && !loading) {
      console.log("[v0] useOnboarding - Progress loaded, running auto-detection")
      autoDetectCompletedSteps()
    }
  }, [progress, loading]) // Only re-run when progress or loading changes

  return {
    progress,
    loading,
    error,
    completeStep,
    refetch: fetchProgress,
  }
}
