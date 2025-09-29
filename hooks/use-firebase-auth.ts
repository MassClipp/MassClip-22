"use client"

import { useState, useEffect, useCallback } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db, isFirebaseConfigured } from "@/lib/firebase"

interface AuthResult {
  success: boolean
  error?: string
  user?: User | null
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [firebaseReady, setFirebaseReady] = useState(isFirebaseConfigured())

  // Set up auth state listener
  useEffect(() => {
    if (!auth) {
      console.error("Firebase auth not initialized")
      setLoading(false)
      setAuthChecked(true)
      return
    }

    console.log("Setting up auth state listener")
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log("Auth state changed:", user ? "User logged in" : "No user")
        setUser(user)
        setLoading(false)
        setAuthChecked(true)
      },
      (error) => {
        console.error("Auth state change error:", error)
        setLoading(false)
        setAuthChecked(true)
      },
    )

    // Cleanup subscription
    return () => unsubscribe()
  }, [])

  // Check Firebase readiness periodically
  useEffect(() => {
    if (firebaseReady) return

    const checkInterval = setInterval(() => {
      const ready = isFirebaseConfigured()
      if (ready) {
        console.log("Firebase is now configured")
        setFirebaseReady(true)
        clearInterval(checkInterval)
      }
    }, 1000)

    return () => clearInterval(checkInterval)
  }, [firebaseReady])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!auth) {
      return { success: false, error: "Firebase auth not initialized" }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return { success: true, user: userCredential.user }
    } catch (error: any) {
      console.error("Sign in error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in",
      }
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, username?: string, displayName?: string): Promise<AuthResult> => {
      if (!auth || !db) {
        return { success: false, error: "Firebase not fully initialized" }
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Create user profile in Firestore
        if (username || displayName) {
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

        return { success: true, user }
      } catch (error: any) {
        console.error("Sign up error:", error)
        return {
          success: false,
          error: error.message || "Failed to create account",
        }
      }
    },
    [],
  )

  const signInWithGoogle = useCallback(async (username?: string, displayName?: string): Promise<AuthResult> => {
    if (!auth || !db) {
      return { success: false, error: "Firebase not fully initialized" }
    }

    try {
      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      const user = userCredential.user

      // Check if user profile exists, create if not
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

      return { success: true, user }
    } catch (error: any) {
      console.error("Google sign in error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in with Google",
      }
    }
  }, [])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!auth) {
      return { success: false, error: "Firebase auth not initialized" }
    }

    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error: any) {
      console.error("Password reset error:", error)
      return {
        success: false,
        error: error.message || "Failed to send reset email",
      }
    }
  }, [])

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!auth) {
      return { success: false, error: "Firebase auth not initialized" }
    }

    try {
      console.log("[v0] Starting comprehensive logout process...")

      setUser(null)
      setLoading(true)

      // 1. Clear Firebase auth state FIRST
      await firebaseSignOut(auth)
      console.log("[v0] Firebase signOut completed")

      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!user) {
            console.log("[v0] Auth state confirmed cleared")
            unsubscribe()
            resolve(true)
          }
        })
        // Timeout after 3 seconds if auth state doesn't clear
        setTimeout(() => {
          unsubscribe()
          resolve(true)
        }, 3000)
      })

      // 2. Clear session cookie via API
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        })
        console.log("[v0] Session cookies cleared")
      } catch (error) {
        console.error("Error clearing session:", error)
      }

      // 3. Clear all browser storage
      try {
        // Clear all localStorage
        localStorage.clear()
        console.log("[v0] localStorage cleared")

        // Clear all sessionStorage
        sessionStorage.clear()
        console.log("[v0] sessionStorage cleared")
      } catch (error) {
        console.error("Error clearing browser storage:", error)
      }

      // 4. Clear Firebase IndexedDB data
      try {
        const databases = await indexedDB.databases()
        const firebaseDBs = databases.filter(
          (db) => db.name?.includes("firebase") || db.name?.includes("firebaseLocalStorageDb"),
        )

        for (const dbInfo of firebaseDBs) {
          if (dbInfo.name) {
            const deleteReq = indexedDB.deleteDatabase(dbInfo.name)
            await new Promise((resolve, reject) => {
              deleteReq.onsuccess = () => resolve(true)
              deleteReq.onerror = () => reject(deleteReq.error)
              // Timeout after 2 seconds
              setTimeout(() => resolve(true), 2000)
            })
            console.log(`[v0] Deleted IndexedDB: ${dbInfo.name}`)
          }
        }
      } catch (error) {
        console.error("Error clearing IndexedDB:", error)
      }

      console.log("[v0] Logout process completed, reloading page...")

      window.location.replace("/")

      return { success: true }
    } catch (error: any) {
      console.error("Sign out error:", error)
      setLoading(false)
      return {
        success: false,
        error: error.message || "Failed to sign out",
      }
    }
  }, [])

  return {
    user,
    loading,
    authChecked,
    firebaseReady,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    signOut,
  }
}

// Export useAuth as an alias for useFirebaseAuth
export const useAuth = useFirebaseAuth
