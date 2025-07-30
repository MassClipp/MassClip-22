"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "./use-firebase-auth"

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  username?: string
  plan?: string
  stripeAccountId?: string
  stripeAccountStatus?: string
}

export function useUser() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    // Convert Firebase user to UserProfile
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }

    setProfile(userProfile)
    setLoading(false)
  }, [user, authLoading])

  return {
    user: profile,
    loading,
    isAuthenticated: !!profile,
  }
}
