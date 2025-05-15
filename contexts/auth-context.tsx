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
  GoogleAuthProvider,
  signInWithPopup,
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
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Map Firebase error codes to generic user-friendly messages
const getGenericErrorMessage = (error: any): string => {
  const errorCode = error?.code || ""

  // Authentication errors
  if (errorCode.includes("auth/user-cancelled") || errorCode.includes("auth/popup-closed-by-user")) {
    return "Login cancelled. Please try again."
  }
  if (errorCode.includes("auth/account-exists-with-different-credential")) {
    return "An account already exists with the same email address but different sign-in credentials."
  }
  if (errorCode.includes("auth/invalid-email")) {
    return "Please enter a valid email address."
  }
  if (errorCode.includes("auth/user-disabled")) {
    return "This account has been disabled. Please contact support."
  }
  if (errorCode.includes("auth/user-not-found") || errorCode.includes("auth/wrong-password")) {
    return "Invalid email or password. Please try again."
  }
  if (errorCode.includes("auth/too-many-requests")) {
    return "Too many unsuccessful login attempts. Please try again later."
  }
  if (errorCode.includes("auth/email-already-in-use")) {
    return "An account with this email already exists."
  }
  if (errorCode.includes("auth/weak-password")) {
    return "Password is too weak. Please use a stronger password."
  }
  if (errorCode.includes("auth/popup-blocked")) {
    return "Login popup was blocked by your browser. Please allow popups for this site."
  }
  if (errorCode.includes("auth/network-request-failed")) {
    return "Network error. Please check your connection and try again."
  }
  if (errorCode.includes("auth/internal-error")) {
    return "An error occurred during authentication. Please try again."
  }

  // Default generic error
  return "Authentication error. Please try again."
}

// Auth provider props
interface AuthProviderProps {
  children: ReactNode
}

// Create the auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
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
      console.error("Error initializing authentication:", error)
      setError("Failed to initialize authentication. Please try again.")
      setLoading(false)
    }
  }, [pathname, router])

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      setError(null)
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      const db = getFirestore()

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      // If user doesn't exist in Firestore, create a new document
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date(),
          plan: "free",
          permissions: { download: false, premium: false },
        })
      }

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
      console.error("Error signing in with Google:", error)
      setError(getGenericErrorMessage(error))
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
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
      setError(getGenericErrorMessage(error))
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
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
      setError(getGenericErrorMessage(error))
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setError(null)
      const auth = getAuth()
      await firebaseSignOut(auth)

      // Clear any cached user data
      setUser(null)

      // Force navigation to login page
      router.push("/login")

      // For a more forceful redirect, you can also use window.location
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return Promise.resolve()
    } catch (error) {
      console.error("Error signing out:", error)
      setError(getGenericErrorMessage(error))
      return Promise.reject(error)
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      setError(null)
      const auth = getAuth()
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error("Error resetting password:", error)
      setError(getGenericErrorMessage(error))
      throw error
    }
  }

  // Provide the auth context to children
  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signInWithGoogle, signUp, signOut, resetPassword }}>
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
