"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { firebaseAuth } from "@/firebase" // <- adjust if your auth export lives elsewhere

/* -------------------------------------------------------------------------- */
/*                              Context & Types                               */
/* -------------------------------------------------------------------------- */

interface AuthContextValue {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/* -------------------------------------------------------------------------- */
/*                                Provider                                    */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const value: AuthContextValue = { user, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* -------------------------------------------------------------------------- */
/*                                Hook                                        */
/* -------------------------------------------------------------------------- */

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuthContext must be used inside <AuthProvider>")
  }
  return ctx
}
