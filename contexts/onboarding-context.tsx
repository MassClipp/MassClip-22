"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@/contexts/auth-context"

interface OnboardingTask {
  id: string
  title: string
  description: string
  completed: boolean
  route: string
  targetElement?: string
}

interface OnboardingContextType {
  tasks: OnboardingTask[]
  currentTaskIndex: number
  allTasksCompleted: boolean
  dismissed: boolean
  isLoading: boolean
  completeTask: (taskId: string) => Promise<void>
  dismissOnboarding: () => Promise<void>
  refreshOnboarding: () => Promise<void>
  shouldShowIndicator: (route: string) => boolean
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [allTasksCompleted, setAllTasksCompleted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchOnboarding = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/onboarding")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        setCurrentTaskIndex(data.currentTaskIndex || 0)
        setAllTasksCompleted(data.allTasksCompleted || false)
        setDismissed(data.dismissed || false)
      }
    } catch (error) {
      console.error("Error fetching onboarding:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOnboarding()
  }, [user])

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })

      if (response.ok) {
        await fetchOnboarding()
      }
    } catch (error) {
      console.error("Error completing task:", error)
    }
  }

  const dismissOnboarding = async () => {
    try {
      const response = await fetch("/api/onboarding/dismiss", {
        method: "POST",
      })

      if (response.ok) {
        setDismissed(true)
      }
    } catch (error) {
      console.error("Error dismissing onboarding:", error)
    }
  }

  const refreshOnboarding = async () => {
    await fetchOnboarding()
  }

  const shouldShowIndicator = (route: string) => {
    if (dismissed || allTasksCompleted || isLoading) return false
    const currentTask = tasks[currentTaskIndex]
    return currentTask?.route === route && !currentTask?.completed
  }

  return (
    <OnboardingContext.Provider
      value={{
        tasks,
        currentTaskIndex,
        allTasksCompleted,
        dismissed,
        isLoading,
        completeTask,
        dismissOnboarding,
        refreshOnboarding,
        shouldShowIndicator,
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
