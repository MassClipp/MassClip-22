"use client"

import { createContext, useContext, type ReactNode, useState } from "react"

interface AuthContextType {
  user: any | null // Replace 'any' with your actual user type
  loading: boolean
  isFirebaseConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; demo?: boolean }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; demo?: boolean }>
  logOut: () => Promise<{ success: boolean; error?: string; demo?: boolean }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string; demo?: boolean }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true)

  const signIn = async (email: string, password: string) => {
    return { success: true }
  }
  const signUp = async (email: string, password: string) => {
    return { success: true }
  }
  const logOut = async () => {
    return { success: true }
  }
  const resetPassword = async (email: string) => {
    return { success: true }
  }

  const value: AuthContextType = {
    user,
    loading,
    isFirebaseConfigured,
    signIn,
    signUp,
    logOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
