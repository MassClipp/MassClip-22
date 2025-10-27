"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getUserObjectives, ensureUserObjectives, type UserObjectivesDoc } from "@/lib/objectives-service"

export function useObjectives() {
  const { user } = useAuth()
  const [objectives, setObjectives] = useState<UserObjectivesDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadObjectives = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const data = await ensureUserObjectives(user.uid)
        setObjectives(data)
      } catch (error) {
        console.error("[useObjectives] Error loading objectives:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadObjectives()
  }, [user])

  const refreshObjectives = async () => {
    if (!user) return

    try {
      const data = await getUserObjectives(user.uid)
      setObjectives(data)
    } catch (error) {
      console.error("[useObjectives] Error refreshing objectives:", error)
    }
  }

  return {
    objectives,
    isLoading,
    refreshObjectives,
  }
}
