"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface OnboardingStep {
  id: string
  title: string
  description: string
  actionText?: string
  actionLink?: string
}

const ONBOARDING_STEPS: Record<string, OnboardingStep> = {
  connect_stripe: {
    id: "connect_stripe",
    title: "Connect Your Stripe Account",
    description: "Start accepting payments by connecting your Stripe account to receive earnings.",
    actionText: "Connect Stripe",
  },
  customize_profile: {
    id: "customize_profile",
    title: "Customize Your Profile",
    description: "Add your bio, social links, and make your storefront uniquely yours.",
    actionText: "Customize Profile",
  },
  add_free_content: {
    id: "add_free_content",
    title: "Add Free Content",
    description: "Upload content to your library to showcase on your public profile.",
    actionText: "Add Content",
  },
}

interface OnboardingStepBannerProps {
  stepId: string
}

export function OnboardingStepBanner({ stepId }: OnboardingStepBannerProps) {
  const { user } = useFirebaseAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const step = ONBOARDING_STEPS[stepId]

  useEffect(() => {
    const checkStepStatus = async () => {
      if (!user || !step) return

      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const completedSteps = userData.completedOnboardingSteps || []
          const dismissedSteps = userData.dismissedOnboardingSteps || []

          setIsCompleted(completedSteps.includes(stepId))
          setIsDismissed(dismissedSteps.includes(stepId))
          setIsVisible(!completedSteps.includes(stepId) && !dismissedSteps.includes(stepId))
        }
      } catch (error) {
        console.error("[v0] Error checking onboarding step status:", error)
      }
    }

    checkStepStatus()
  }, [user, stepId, step])

  const handleDismiss = async () => {
    if (!user) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const dismissedSteps = userData.dismissedOnboardingSteps || []

        await updateDoc(userDocRef, {
          dismissedOnboardingSteps: [...dismissedSteps, stepId],
        })

        setIsDismissed(true)
        setIsVisible(false)
      }
    } catch (error) {
      console.error("[v0] Error dismissing onboarding step:", error)
    }
  }

  const handleComplete = async () => {
    if (!user) return

    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const completedSteps = userData.completedOnboardingSteps || []

        await updateDoc(userDocRef, {
          completedOnboardingSteps: [...completedSteps, stepId],
        })

        setIsCompleted(true)
        setIsVisible(false)
      }
    } catch (error) {
      console.error("[v0] Error completing onboarding step:", error)
    }
  }

  if (!step || !isVisible || isCompleted || isDismissed) {
    return null
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-600 to-purple-700 rounded-full flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="text-white font-semibold text-lg">{step.title}</h3>
          <p className="text-zinc-300 text-sm">{step.description}</p>

          {step.actionText && (
            <Button
              onClick={handleComplete}
              size="sm"
              className="bg-white text-black hover:bg-zinc-100 font-medium mt-3"
            >
              {step.actionText}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
