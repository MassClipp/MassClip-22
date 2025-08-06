'use client'

import { useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  username?: string
  stripeAccountId?: string
  stripeAccountStatus?: {
    details_submitted: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    requirements?: any
    last_updated: string
  }
  plan?: string
  createdAt?: string
  updatedAt?: string
}

export function useUser() {
  const [user, loading, error] = useAuthState(auth)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async (firebaseUser: User) => {
      try {
        setProfileLoading(true)
        setProfileError(null)

        const response = await fetch('/api/user-profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }

        const profileData = await response.json()
        
        setProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          ...profileData
        })
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setProfileError(err instanceof Error ? err.message : 'Failed to load profile')
        
        // Fallback to basic Firebase user data
        setProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        })
      } finally {
        setProfileLoading(false)
      }
    }

    if (user && !loading) {
      fetchUserProfile(user)
    } else if (!user && !loading) {
      setProfile(null)
      setProfileLoading(false)
      setProfileError(null)
    }
  }, [user, loading])

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user)
    }
  }

  return {
    user,
    profile,
    loading: loading || profileLoading,
    error: error || profileError,
    refreshProfile
  }
}

// Helper hook for checking if user is authenticated
export function useAuth() {
  const { user, loading, error } = useUser()
  
  return {
    user,
    isAuthenticated: !!user,
    loading,
    error
  }
}

// Helper hook for getting user ID
export function useUserId() {
  const { user } = useUser()
  return user?.uid || null
}
