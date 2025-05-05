"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, getDoc, setDoc, getFirestore } from "firebase/firestore"
import { useRouter, usePathname } from "next/navigation"
import { initializeFirebaseApp } from "@/lib/firebase"

// Define the user type
export interface User extends FirebaseUser {
  plan?: string
  permissions?: {
    download?: boolean
    premium?: boolean
  }
}

// Define the auth context type
interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider props
interface AuthProviderProps {
  children: ReactNode
}

// Create the auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Initialize Firebase when the component mounts
  useEffect(() => {
    try {
      initializeFirebaseApp()
      const auth = getAuth()
      const db = getFirestore()

      // Subscribe to auth state changes
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Get additional user data from Firestore
          try {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

            if (userDoc.exists()) {
              // Combine Firebase user with Firestore data
              const userData = userDoc.data()
              const enhancedUser = {
                ...firebaseUser,
                plan: userData.plan || "free",
                permissions: userData.permissions || { download: false, premium: false },
              } as User

              setUser(enhancedUser)
            } else {
              // Create a new user document if it doesn't exist
              const newUserData = {
                email: firebaseUser.email,
                createdAt: new Date(),
                plan: "free",
                permissions: { download: false, premium: false },
              }

              await setDoc(doc(db, "users", firebaseUser.uid), newUserData)

              const enhancedUser = {
                ...firebaseUser,
                plan: "free",
                permissions: { download: false, premium: false },
              } as User

              setUser(enhancedUser)
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
            // Still set the basic user even if Firestore fails
            setUser(firebaseUser as User)
          }
        } else {
          setUser(null)

          // Check if we need to redirect to login
          // Use a safe way to check if we're on a protected route
          const isProtectedRoute = pathname?.startsWith("/dashboard") || false

          if (isProtectedRoute) {
            // Use Next.js router for navigation instead of window.location
            router.push(`/login?redirect=${encodeURIComponent(pathname || "")}`)
          }
        }

        setLoading(false)
      })

      // Cleanup subscription on unmount
      return () => unsubscribe()
    } catch (error) {
      console.error("Error initializing Firebase:", error)
      setLoading(false)
    }
  }, [pathname, router])

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const auth = getAuth()
      await signInWithEmailAndPassword(auth, email, password)

      // Get redirect URL from query params if we're in the browser
      let redirectTo = "/dashboard"

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get("redirect")
        if (redirect) {
          redirectTo = redirect
        }
      }

      router.push(redirectTo)
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const auth = getAuth()
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)

      // Create user document in Firestore
      const db = getFirestore()
      await setDoc(doc(db, "users", newUser.uid), {
        email,
        createdAt: new Date(),
        plan: "free",
        permissions: { download: false, premium: false },
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      const auth = getAuth()
      await firebaseSignOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      const auth = getAuth()
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error("Error resetting password:", error)
      throw error
    }
  }

  // Provide the auth context to children
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
