"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { User } from "firebase/auth"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; demo?: boolean }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; demo?: boolean }>
  logOut: () => Promise<{ success: boolean; error?: string; demo?: boolean }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string; demo?: boolean }>
  isFirebaseConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Add useAuthContext as an alias for useAuth to fix the missing export
export const useAuthContext = useAuth
