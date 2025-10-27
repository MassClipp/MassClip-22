"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./auth-context"
import {
  type OnboardingProgress,
  getOnboardingProgress,
  initializeOnboarding,
  completeTask as completeTaskService,
  dismissOnboarding as dismissOnboardingService,
} from "@/lib/onboarding-service"

interface OnboardingContextType {
  progress: OnboardingProgress | null
  loading: boolean
  completeTask: (taskId: string) => Promise<void>
  dismissOnboarding: () => Promise<void>
  getCurrentTask: () => { id: string; route?: string; targetElement?: string } | null
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOnboarding() {
      if (!user) {
        setProgress(null)
        setLoading(false)
        return
      }

      try {
        let onboardingProgress = await getOnboardingProgress(user.uid)

        // Initialize onboarding for new users
        if (!onboardingProgress) {
          onboardingProgress = await initializeOnboarding(user.uid)
        }

        setProgress(onboardingProgress)
      } catch (error) {
        console.error("[v0] Error loading onboarding:", error)
      } finally {
        setLoading(false)
      }
    }

    loadOnboarding()
  }, [user])

  const completeTask = async (taskId: string) => {
    if (!user) return

    try {
      await completeTaskService(user.uid, taskId)
      const updatedProgress = await getOnboardingProgress(user.uid)
      setProgress(updatedProgress)
    } catch (error) {
      console.error("[v0] Error completing task:", error)
    }
  }

  const dismissOnboarding = async () => {
    if (!user) return

    try {
      await dismissOnboardingService(user.uid)
      const updatedProgress = await getOnboardingProgress(user.uid)
      setProgress(updatedProgress)
    } catch (error) {
      console.error("[v0] Error dismissing onboarding:", error)
    }
  }

  const getCurrentTask = () => {
    if (!progress || progress.isDismissed || progress.isComplete) {
      return null
    }

    const currentTask = progress.tasks[progress.currentTaskIndex]
    if (!currentTask) return null

    return {
      id: currentTask.id,
      route: currentTask.route,
      targetElement: currentTask.targetElement,
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        progress,
        loading,
        completeTask,
        dismissOnboarding,
        getCurrentTask,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider")
  }
  return context
}
