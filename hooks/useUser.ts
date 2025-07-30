"use client"
import { useAuth } from "@/contexts/auth-context"

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
  const { user, loading } = useAuth()

  return {
    user,
    loading,
    isAuthenticated: !!user,
  }
}
