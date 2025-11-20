"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
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
  dismissed?: boolean
}

const STEP_ORDER = [
  "upload_content",
  "add_free_content",
  "setup_stripe",
  "create_bundle",
  "setup_storefront",
  "go_live",
]

export function useOnboarding() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const attemptedSteps = useRef<Set<string>>(new Set())
  const hasRunAutoDetection = useRef(false)

  const refetch = useCallback(async () => {
    if (!user) return

    try {
      console.log("[v0] useOnboarding - Manual refetch triggered")
      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/onboarding-progress", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] useOnboarding - Refetch completed:", data)
        // The real-time listener will pick up the changes automatically
      }
    } catch (err) {
      console.error("[v0] useOnboarding - Error refetching:", err)
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
        attemptedSteps.current.add(stepId)
        return data
      } catch (err) {
        console.error("[v0] useOnboarding - Error completing step:", err)
        throw err
      }
    },
    [user],
  )

  const dismiss = useCallback(async () => {
    if (!user) return

    try {
      console.log("[v0] useOnboarding - Dismissing onboarding")
      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/onboarding-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "dismiss" }),
      })

      if (!response.ok) {
        throw new Error("Failed to dismiss onboarding")
      }

      const data = await response.json()
      console.log("[v0] useOnboarding - Dismissed, new state:", data)
    } catch (err) {
      console.error("[v0] useOnboarding - Error dismissing:", err)
      throw err
    }
  }, [user])

  const toggleStep = useCallback(
    async (stepId: string) => {
      if (!user) return

      try {
        console.log("[v0] useOnboarding - Toggling step:", stepId)
        const idToken = await user.getIdToken()
        const response = await fetch("/api/user/onboarding-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ stepId, action: "toggle" }),
        })

        if (!response.ok) {
          throw new Error("Failed to toggle step")
        }

        const data = await response.json()
        console.log("[v0] useOnboarding - Step toggled, new progress:", data)
        return data
      } catch (err) {
        console.error("[v0] useOnboarding - Error toggling step:", err)
        throw err
      }
    },
    [user],
  )

  const autoDetectCompletedSteps = useCallback(async () => {
    if (!user || !progress || hasRunAutoDetection.current) {
      console.log("[v0] useOnboarding - Skipping auto-detect:", {
        hasUser: !!user,
        hasProgress: !!progress,
        alreadyRan: hasRunAutoDetection.current,
      })
      return
    }

    hasRunAutoDetection.current = true
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
        const uploadsQuery = query(collection(db, "uploads"), where("uid", "==", user.uid))
        const uploadsSnapshot = await getDocs(uploadsQuery)

        if (!uploadsSnapshot.empty) {
          console.log("[v0] useOnboarding - upload_content conditions met")
          stepsToComplete.push("upload_content")
        }
      }

      const addFreeContentStep = progress.steps.find((s) => s.id === "add_free_content")
      if (addFreeContentStep && !addFreeContentStep.completed && !attemptedSteps.current.has("add_free_content")) {
        const freeUploadsQuery = query(
          collection(db, "uploads"),
          where("uid", "==", user.uid),
          where("isFreeContent", "==", true),
        )
        const freeUploadsSnapshot = await getDocs(freeUploadsQuery)

        if (!freeUploadsSnapshot.empty) {
          console.log("[v0] useOnboarding - add_free_content conditions met")
          stepsToComplete.push("add_free_content")
        }
      }

      const setupStripeStep = progress.steps.find((s) => s.id === "setup_stripe")
      if (setupStripeStep && !setupStripeStep.completed && !attemptedSteps.current.has("setup_stripe")) {
        if (userData.stripeConnected === true || userData.stripeAccountId) {
          console.log("[v0] useOnboarding - setup_stripe conditions met")
          stepsToComplete.push("setup_stripe")
        }
      }

      const createBundleStep = progress.steps.find((s) => s.id === "create_bundle")
      if (createBundleStep && !createBundleStep.completed && !attemptedSteps.current.has("create_bundle")) {
        const bundlesQuery = query(collection(db, "bundles"), where("creatorId", "==", user.uid))
        const bundlesSnapshot = await getDocs(bundlesQuery)

        const productBoxesQuery = query(collection(db, "productBoxes"), where("creatorId", "==", user.uid))
        const productBoxesSnapshot = await getDocs(productBoxesQuery)

        if (!bundlesSnapshot.empty || !productBoxesSnapshot.empty) {
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
      if (stepsToComplete.length > 0) {
        for (const stepId of stepsToComplete) {
          await completeStep(stepId)
        }
      }
    } catch (err) {
      console.error("[v0] useOnboarding - Error auto-detecting steps:", err)
    }
  }, [user, progress, completeStep])

  useEffect(() => {
    if (!user) {
      console.log("[v0] useOnboarding - No user, skipping listener setup")
      setLoading(false)
      return
    }

    console.log("[v0] useOnboarding - Setting up real-time listener for user:", user.uid)

    // Set up real-time listener on the onboarding document
    const onboardingDocRef = doc(db, "onboarding", user.uid)

    const unsubscribe = onSnapshot(
      onboardingDocRef,
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          // Document exists, use the data directly
          const data = docSnapshot.data() as OnboardingProgress
          console.log("[v0] useOnboarding - Real-time update received:", {
            isComplete: data.isComplete,
            completedSteps: data.completedSteps,
            currentStep: data.currentStep,
            totalSteps: data.steps?.length,
            dismissed: data.dismissed,
          })

          if (data.steps) {
            data.steps.sort((a, b) => {
              const indexA = STEP_ORDER.indexOf(a.id)
              const indexB = STEP_ORDER.indexOf(b.id)
              // If id not found in order array, put it at the end
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
            })
          }

          setProgress(data)
          hasRunAutoDetection.current = false
          setLoading(false)
        } else {
          // Document doesn't exist yet, trigger API to create it
          console.log("[v0] useOnboarding - Document doesn't exist, initializing via API")
          try {
            const idToken = await user.getIdToken()
            const response = await fetch("/api/user/onboarding-progress", {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            })

            if (response.ok) {
              const data = await response.json()
              console.log("[v0] useOnboarding - Initialized progress:", data)
              // Don't set progress here - the listener will pick up the new document
            }
          } catch (err) {
            console.error("[v0] useOnboarding - Error initializing:", err)
            setError(err instanceof Error ? err.message : "Failed to initialize onboarding")
          } finally {
            setLoading(false)
          }
        }
      },
      (err) => {
        console.error("[v0] useOnboarding - Listener error:", err)
        setError(err.message)
        setLoading(false)
      },
    )

    // Cleanup listener on unmount
    return () => {
      console.log("[v0] useOnboarding - Cleaning up listener")
      unsubscribe()
    }
  }, [user])

  useEffect(() => {
    if (progress && !loading && !hasRunAutoDetection.current) {
      console.log("[v0] useOnboarding - Progress loaded, running auto-detection")
      autoDetectCompletedSteps()
    }
  }, [progress, loading, autoDetectCompletedSteps])

  return {
    progress,
    loading,
    error,
    completeStep,
    toggleStep, // Expose toggleStep function
    dismiss,
    refetch,
  }
}
