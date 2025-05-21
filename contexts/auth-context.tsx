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
import { doc, getDoc, setDoc, deleteDoc, getFirestore, serverTimestamp, writeBatch } from "firebase/firestore"
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
  signInWithGoogle: () => Promise<void>
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

  // Create session cookie
  const createSession = async (user: FirebaseUser) => {
    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        throw new Error("Failed to create session")
      }

      console.log("[AuthContext] Session created successfully")
      return true
    } catch (error) {
      console.error("[AuthContext] Error creating session:", error)
      return false
    }
  }

  // Initialize user subcollections - critical to prevent permission errors
  const initializeUserSubcollections = async (uid: string) => {
    console.log(`[AuthContext] Initializing subcollections for user: ${uid}`)
    try {
      const db = getFirestore()

      // Use a batch to ensure atomic operations
      const batch = writeBatch(db)

      // Initialize favorites subcollection
      const favInitDoc = doc(db, `users/${uid}/favorites/__init__`)
      batch.set(favInitDoc, {
        createdAt: new Date(),
        temporary: true,
      })

      // Initialize history subcollection
      const histInitDoc = doc(db, `users/${uid}/history/__init__`)
      batch.set(histInitDoc, {
        createdAt: new Date(),
        temporary: true,
      })

      // Commit the batch
      await batch.commit()
      console.log(`[AuthContext] Subcollections initialized with batch write`)

      // Now delete the temporary documents
      await deleteDoc(favInitDoc)
      await deleteDoc(histInitDoc)
      console.log(`[AuthContext] Temporary documents deleted`)

      return true
    } catch (error) {
      console.error("[AuthContext] Error initializing subcollections:", error)
      return false
    }
  }

  // Initialize Firebase when the component mounts
  useEffect(() => {
    try {
      initializeFirebaseApp()
      const auth = getAuth()
      const db = getFirestore()

      // Subscribe to auth state changes
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Create session cookie if user is authenticated
          await createSession(firebaseUser)

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

              // Ensure subcollections exist for existing users
              await initializeUserSubcollections(firebaseUser.uid)
            } else {
              // Create a new user document if it doesn't exist
              const newUserData = {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                createdAt: new Date(),
                plan: "free",
                permissions: { download: false, premium: false },
                bio: "",
              }

              await setDoc(doc(db, "users", firebaseUser.uid), newUserData)

              // Initialize subcollections
              await initializeUserSubcollections(firebaseUser.uid)

              const enhancedUser = {
                ...firebaseUser,
                plan: "free",
                permissions: { download: false, premium: false },
              } as User

              setUser(enhancedUser)
            }
          } catch (error) {
            console.error("[AuthContext] Error fetching user data:", error)
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
      console.error("[AuthContext] Error initializing Firebase:", error)
      setLoading(false)
    }
  }, [pathname, router])

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      const db = getFirestore()

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Create session cookie
      await createSession(user)

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
          bio: "",
        })

        // Initialize subcollections
        await initializeUserSubcollections(user.uid)
      } else {
        // Ensure subcollections exist for existing users
        await initializeUserSubcollections(user.uid)
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
      console.error("[AuthContext] Error signing in with Google:", error)
      throw error
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

      // Create session cookie
      await createSession(userCredential.user)

      // Ensure subcollections exist
      await initializeUserSubcollections(userCredential.user.uid)

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
      console.error("[AuthContext] Error signing in:", error)
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

      // Create session cookie
      await createSession(newUser)

      // Create user document in Firestore
      const db = getFirestore()
      await setDoc(doc(db, "users", newUser.uid), {
        email,
        createdAt: serverTimestamp(),
        plan: "free",
        permissions: { download: false, premium: false },
        bio: "",
        photoURL: null,
      })

      // Initialize subcollections - critical step to prevent permission errors
      await initializeUserSubcollections(newUser.uid)

      router.push("/dashboard")
    } catch (error) {
      console.error("[AuthContext] Error signing up:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out function - fixed to properly handle errors and return a Promise
  const signOut = async () => {
    try {
      setLoading(true)

      // Clear session cookie
      await fetch("/api/logout", {
        method: "POST",
      })

      const auth = getAuth()
      await firebaseSignOut(auth)

      // Clear any cached user data
      setUser(null)

      // Return a resolved promise
      return Promise.resolve()
    } catch (error) {
      console.error("[AuthContext] Error signing out:", error)
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
      console.error("[AuthContext] Error resetting password:", error)
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
