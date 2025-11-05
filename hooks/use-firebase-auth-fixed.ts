"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth"
import { doc, setDoc, getDoc, getFirestore } from "firebase/firestore"
import { initializeFirebaseApp } from "@/lib/firebase"

interface AuthResult {
  success: boolean
  error?: string
  demo?: boolean
}

export function useFirebaseAuthFixed() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const initializationRef = useRef(false)

  // Initialize Firebase only once
  useEffect(() => {
    if (initializationRef.current) return
    initializationRef.current = true

    try {
      const { auth } = initializeFirebaseApp()
      setIsFirebaseConfigured(true)

      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log("Auth state changed:", firebaseUser?.uid || "null")

        if (firebaseUser) {
          // Create session when user is authenticated
          try {
            const idToken = await firebaseUser.getIdToken()
            await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
              credentials: "include",
            })
            console.log("Session created successfully")
          } catch (error) {
            console.error("Failed to create session:", error)
          }
        }

        setUser(firebaseUser)
        setLoading(false)
        setAuthChecked(true)
      })

      unsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error("Firebase initialization error:", error)
      setIsFirebaseConfigured(false)
      setLoading(false)
      setAuthChecked(true)
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!isFirebaseConfigured) {
        return { success: false, error: "Firebase not configured" }
      }

      try {
        const { auth } = initializeFirebaseApp()
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        console.log("Sign in successful:", userCredential.user.uid)
        return { success: true }
      } catch (error: any) {
        console.error("Sign in error:", error)
        return {
          success: false,
          error: error.message || "Failed to sign in",
        }
      }
    },
    [isFirebaseConfigured],
  )

  const signUp = useCallback(
    async (email: string, password: string, username?: string, displayName?: string): Promise<AuthResult> => {
      if (!isFirebaseConfigured) {
        return { success: false, error: "Firebase not configured" }
      }

      try {
        const { auth } = initializeFirebaseApp()
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Create user profile in Firestore
        if (username || displayName) {
          const db = getFirestore()
          await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            username: username || "",
            displayName: displayName || "",
            createdAt: new Date(),
            plan: "free",
          })

          if (username) {
            await setDoc(doc(db, "usernames", username), {
              uid: user.uid,
              createdAt: new Date(),
            })
          }
        }

        console.log("Sign up successful:", user.uid)
        return { success: true }
      } catch (error: any) {
        console.error("Sign up error:", error)
        return {
          success: false,
          error: error.message || "Failed to create account",
        }
      }
    },
    [isFirebaseConfigured],
  )

  const signInWithGoogle = useCallback(
    async (username?: string, displayName?: string): Promise<AuthResult> => {
      if (!isFirebaseConfigured) {
        return { success: false, error: "Firebase not configured" }
      }

      try {
        const { auth } = initializeFirebaseApp()
        const provider = new GoogleAuthProvider()
        const userCredential = await signInWithPopup(auth, provider)
        const user = userCredential.user

        // Check if user profile exists, create if not
        const db = getFirestore()
        const userDoc = await getDoc(doc(db, "users", user.uid))

        if (!userDoc.exists()) {
          await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            username: username || "",
            displayName: displayName || user.displayName || "",
            createdAt: new Date(),
            plan: "free",
          })

          if (username) {
            await setDoc(doc(db, "usernames", username), {
              uid: user.uid,
              createdAt: new Date(),
            })
          }
        }

        console.log("Google sign in successful:", user.uid)
        return { success: true }
      } catch (error: any) {
        console.error("Google sign in error:", error)
        return {
          success: false,
          error: error.message || "Failed to sign in with Google",
        }
      }
    },
    [isFirebaseConfigured],
  )

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!isFirebaseConfigured) {
        return { success: false, error: "Firebase not configured" }
      }

      try {
        const { auth } = initializeFirebaseApp()
        await sendPasswordResetEmail(auth, email)
        return { success: true }
      } catch (error: any) {
        console.error("Password reset error:", error)
        return {
          success: false,
          error: error.message || "Failed to send reset email",
        }
      }
    },
    [isFirebaseConfigured],
  )

  const logOut = useCallback(async (): Promise<AuthResult> => {
    if (!isFirebaseConfigured) {
      return { success: false, error: "Firebase not configured" }
    }

    try {
      const { auth } = initializeFirebaseApp()
      await signOut(auth)

      // Clear session cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      console.log("Logout successful")
      return { success: true }
    } catch (error: any) {
      console.error("Logout error:", error)
      return {
        success: false,
        error: error.message || "Failed to log out",
      }
    }
  }, [isFirebaseConfigured])

  return {
    user,
    loading,
    authChecked,
    isFirebaseConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    logOut,
  }
}
