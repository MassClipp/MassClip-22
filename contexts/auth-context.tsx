"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from "firebase/auth"
import { useRouter } from "next/navigation"
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth"
import { doc, getDoc, setDoc, getFirestore } from "firebase/firestore"
import { usePathname } from "next/navigation"
import { initializeFirebaseApp } from "@/lib/firebase"

// Set persistence to local
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("Firebase persistence set to local"))
  .catch((error) => console.error("Error setting persistence:", error))

// Define the user type
export interface User extends FirebaseUser {
  plan?: string
  username?: string
}

// Define the auth context type
type AuthContextType = {
  user: any
  loading: boolean
  signOut: () => Promise<void>
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

// Auth provider props
interface AuthProviderProps {
  children: React.ReactNode
}

// Create the auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Initialize Firebase when the component mounts
  useEffect(() => {
    console.log("Setting up auth state listener...")
    try {
      initializeFirebaseApp()
      const db = getFirestore()

      // Subscribe to auth state changes
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        console.log("🔥 Auth context state changed:", currentUser?.email || "Not logged in")
        if (currentUser) {
          // Get additional user data from Firestore
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid))

            if (userDoc.exists()) {
              // Combine Firebase user with Firestore data
              const userData = userDoc.data()
              const enhancedUser = {
                ...currentUser,
                plan: userData.plan || "free",
                username: userData.username || null,
              } as User

              setUser(enhancedUser)
            } else {
              // Create a new user document if it doesn't exist
              const newUserData = {
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                createdAt: new Date(),
                plan: "free",
              }

              await setDoc(doc(db, "users", currentUser.uid), newUserData)

              const enhancedUser = {
                ...currentUser,
                plan: "free",
              } as User

              setUser(enhancedUser)
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
            // Still set the basic user even if Firestore fails
            setUser(currentUser as User)
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

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      console.log("User signed out")
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
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
  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}
