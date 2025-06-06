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
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"
import { doc, getDoc, setDoc, getFirestore } from "firebase/firestore"
import { useRouter, usePathname } from "next/navigation"
import { initializeFirebaseApp } from "@/lib/firebase"

// Define the user type
export interface User extends FirebaseUser {
  plan?: string
  username?: string
}

// Define the auth context type
interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshSession: () => Promise<boolean>
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

      // Set persistence before listening to auth changes
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Error setting persistence:", error)
      })

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
                username: userData.username || null,
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
              }

              await setDoc(doc(db, "users", firebaseUser.uid), newUserData)

              const enhancedUser = {
                ...firebaseUser,
                plan: "free",
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
        }

        setLoading(false)
      })

      // Cleanup subscription on unmount
      return () => {
        unsubscribe()
      }
    } catch (error) {
      console.error("Error initializing Firebase:", error)
      setLoading(false)
    }
  }, [pathname, router])

  // Manually refresh the session
  const refreshSession = async (): Promise<boolean> => {
    try {
      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) {
        return false
      }

      // Refresh the user data from Firestore
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, "users", currentUser.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const enhancedUser = {
          ...currentUser,
          plan: userData.plan || "free",
          username: userData.username || null,
        } as User

        setUser(enhancedUser)
      }

      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      return false
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      const db = getFirestore()

      const result = await signInWithPopup(auth, provider)
      const user = result.user
      console.log("Google sign-in successful for user:", user.uid)

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
      return { success: true }
    } catch (error) {
      console.error("Error signing in with Google:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign in with Google",
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const auth = getAuth()
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("Email sign-in successful for user:", userCredential.user.uid)

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
      return { success: true }
    } catch (error) {
      console.error("Error signing in:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign in",
      }
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
      console.log("Sign-up successful for user:", newUser.uid)

      // Create user document in Firestore
      const db = getFirestore()
      await setDoc(doc(db, "users", newUser.uid), {
        email,
        createdAt: new Date(),
        plan: "free",
      })

      router.push("/dashboard")
      return { success: true }
    } catch (error) {
      console.error("Error signing up:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign up",
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true)
      const auth = getAuth()
      await firebaseSignOut(auth)

      // Clear the session cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Include cookies with the request
      })
      console.log("Logged out and cleared session cookie")

      // Clear any cached user data
      setUser(null)

      // Return a resolved promise
      return Promise.resolve()
    } catch (error) {
      console.error("Error signing out:", error)
      return Promise.reject(error)
    } finally {
      setLoading(false)
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        resetPassword,
        refreshSession,
      }}
    >
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
