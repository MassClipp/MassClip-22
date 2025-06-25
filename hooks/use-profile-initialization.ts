"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ProfileManager } from "@/lib/profile-manager"

export function useProfileInitialization() {
  const { user } = useAuth()
  const [isInitializing, setIsInitializing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeProfile = async () => {
      if (!user || isComplete) return

      setIsInitializing(true)
      setError(null)

      try {
        console.log("🔄 Initializing profile for user:", user.uid)

        // Check if profile already exists
        const { exists, profile } = await ProfileManager.checkUserProfile(user.uid)

        if (exists && profile) {
          console.log("✅ Profile already exists:", profile.username)
          setUsername(profile.username)
          setIsComplete(true)
          return
        }

        // Create complete profile setup
        const result = await ProfileManager.setupCompleteProfile(
          user.uid,
          user.email || "",
          user.displayName || undefined,
          user.photoURL || undefined,
        )

        if (result.success) {
          console.log("✅ Profile setup complete:", result.username)
          setUsername(result.username || null)
          setIsComplete(true)
        } else {
          console.error("❌ Profile setup failed:", result.error)
          setError(result.error || "Failed to setup profile")
        }
      } catch (error) {
        console.error("❌ Profile initialization error:", error)
        setError(error instanceof Error ? error.message : "Unknown error")
      } finally {
        setIsInitializing(false)
      }
    }

    initializeProfile()
  }, [user, isComplete])

  return {
    isInitializing,
    isComplete,
    username,
    error,
  }
}
