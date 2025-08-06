'use client'

import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { useAuth } from '@/contexts/auth-context'

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
  stripeAccountId?: string
  stripeAccountStatus?: string
  createdAt?: string
  updatedAt?: string
}

export function useUser() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    // Convert Firebase User to UserProfile
    const userProfile: UserProfile = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
      emailVerified: authUser.emailVerified,
    }

    setUser(userProfile)
    setLoading(false)
  }, [authUser, authLoading])

  const refreshUser = async () => {
    if (!authUser) return

    try {
      setError(null)
      // Optionally fetch additional user data from your API
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${await authUser.getIdToken()}`
        }
      })

      if (response.ok) {
        const profileData = await response.json()
        setUser(prev => prev ? { ...prev, ...profileData } : null)
      }
    } catch (err: any) {
      console.error('Error refreshing user profile:', err)
      setError(err.message || 'Failed to refresh user profile')
    }
  }

  return {
    user,
    loading: loading || authLoading,
    error,
    refreshUser
  }
}
