"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface AuthContextType {
  user: any | null // Replace 'any' with a more specific type if possible
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useFirebaseAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Add this export at the end of the file
