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
  username?: string
  displayName?: string
}

// Define the auth context type
interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signInWithGoogle: (username?: string, displayName?: string) => Promise<{ success: boolean; error?: string }>
  signUp: (
    email: string,
    password: string,
    username?: string,
    displayName?: string,
  ) => Promise<{ success: boolean; error?: string }>
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
      console.error("Error initializing Firebase:", error)
      setLoading(false)
    }
  }, [pathname, router])

  // Sign in with Google
  const signInWithGoogle = async (username?: string, displayName?: string) => {
    try {
      setLoading(true)
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      const db = getFirestore()

      // Check if username is already taken
      if (username) {
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          return { success: false, error: "Username is already taken" }
        }
      }

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (!userDoc.exists()) {
        // Create new user document
        const userData = {
          email: user.email,
          displayName: displayName || user.displayName,
          username: username || null,
          photoURL: user.photoURL,
          createdAt: new Date(),
          plan: "free",
          permissions: { download: false, premium: false },
        }

        await setDoc(doc(db, "users", user.uid), userData)

        // If username is provided, also create a document in the usernames collection
        if (username) {
          await setDoc(doc(db, "usernames", username), {
            uid: user.uid,
            createdAt: new Date(),
          })

          // Create a document in the creators collection
          await setDoc(doc(db, "creators", username), {
            uid: user.uid,
            username,
            displayName: displayName || user.displayName || username,
            createdAt: new Date(),
            bio: "",
            profilePic: user.photoURL || "",
            freeClips: [],
            paidClips: [],
          })
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error signing in with Google:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in with Google",
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
  const signUp = async (email: string, password: string, username?: string, displayName?: string) => {
    try {
      setLoading(true)
      const auth = getAuth()
      const db = getFirestore()

      // Check if username is already taken
      if (username) {
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          return { success: false, error: "Username is already taken" }
        }
      }

      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)

      // Create user document in Firestore
      const userData = {
        email,
        displayName: displayName || null,
        username: username || null,
        createdAt: new Date(),
        plan: "free",
        permissions: { download: false, premium: false },
      }

      await setDoc(doc(db, "users", newUser.uid), userData)

      // If username is provided, also create a document in the usernames collection
      if (username) {
        await setDoc(doc(db, "usernames", username), {
          uid: newUser.uid,
          createdAt: new Date(),
        })

        // Create a document in the creators collection
        await setDoc(doc(db, "creators", username), {
          uid: newUser.uid,
          username,
          displayName: displayName || username,
          createdAt: new Date(),
          bio: "",
          profilePic: "",
          freeClips: [],
          paidClips: [],
        })
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error signing up:", error)
      return {
        success: false,
        error: error.message || "Failed to create account",
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
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
      return Promise.reject(error)
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
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signUp, signOut, resetPassword }}>
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
