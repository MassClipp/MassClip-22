"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface UserProfile {
  uid: string
  email: string
  username: string
  displayName: string
  role: string
  plan: string
  permissions: string[]
  profile: {
    avatar: string
    bio: string
    website: string
    location: string
    socialLinks: Record<string, string>
  }
  settings: {
    notifications: {
      email: boolean
      push: boolean
      marketing: boolean
    }
    privacy: {
      profilePublic: boolean
      showEmail: boolean
    }
  }
  subscription: {
    status: string
    plan: string
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd: boolean
  }
  usage: {
    storageUsed: number
    uploadsThisMonth: number
    downloadsThisMonth: number
  }
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date
  isActive: boolean
  emailVerified: boolean
}

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = await user.getIdToken()
        const response = await fetch("/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data = await response.json()
        setProfile(data.profile)
      } catch (err) {
        console.error("Error fetching user profile:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()
      setProfile(data.profile)
      return data.profile
    } catch (err) {
      console.error("Error updating profile:", err)
      throw err
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: () => {
      if (user) {
        // Trigger re-fetch by updating the dependency
        setLoading(true)
      }
    },
  }
}
