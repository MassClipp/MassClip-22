"use client"

import { useState, useEffect, useCallback } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { firebaseAuth, firebaseDb, isFirebaseConfigured, firebaseError } from "@/lib/firebase-safe"

interface AuthResult {
  success: boolean
  error?: string
  user?: User | null
}

export function useFirebaseAuthSafe() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setConfigError(firebaseError || "Firebase not configured")
      setLoading(false)
      setAuthChecked(true)
      return
    }

    if (!firebaseAuth) {
      setConfigError("Firebase Auth not initialized")
      setLoading(false)
      setAuthChecked(true)
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setUser(user)
      setLoading(false)
      setAuthChecked(true)
    })

    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { success: false, error: "Firebase not configured" }
    }

    try {
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password)
      return { success: true, user: result.user }
    } catch (error: any) {
      console.error("Sign in error:", error)
      return { success: false, error: error.message }
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, username: string, displayName: string): Promise<AuthResult> => {
      if (!isFirebaseConfigured || !firebaseAuth || !firebaseDb) {
        return { success: false, error: "Firebase not configured" }
      }

      try {
        const result = await createUserWithEmailAndPassword(firebaseAuth, email, password)

        // Create user profile
        await setDoc(doc(firebaseDb, "users", result.user.uid), {
          email,
          username,
          displayName,
          createdAt: new Date(),
          plan: "free",
        })

        // Reserve username
        await setDoc(doc(firebaseDb, "usernames", username), {
          uid: result.user.uid,
          createdAt: new Date(),
        })

        return { success: true, user: result.user }
      } catch (error: any) {
        console.error("Sign up error:", error)
        return { success: false, error: error.message }
      }
    },
    [],
  )

  const signInWithGoogle = useCallback(async (username?: string, displayName?: string): Promise<AuthResult> => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { success: false, error: "Firebase not configured" }
    }

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(firebaseAuth, provider)

      // Check if user profile exists
      if (firebaseDb) {
        const userDoc = await getDoc(doc(firebaseDb, "users", result.user.uid))

        if (!userDoc.exists() && username && displayName) {
          // Create user profile for new Google users
          await setDoc(doc(firebaseDb, "users", result.user.uid), {
            email: result.user.email,
            username,
            displayName,
            createdAt: new Date(),
            plan: "free",
          })

          await setDoc(doc(firebaseDb, "usernames", username), {
            uid: result.user.uid,
            createdAt: new Date(),
          })
        }
      }

      return { success: true, user: result.user }
    } catch (error: any) {
      console.error("Google sign in error:", error)
      return { success: false, error: error.message }
    }
  }, [])

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      return { success: false, error: "Firebase not configured" }
    }

    try {
      await firebaseSignOut(firebaseAuth)
      return { success: true }
    } catch (error: any) {
      console.error("Sign out error:", error)
      return { success: false, error: error.message }
    }
  }, [])

  return {
    user,
    loading,
    authChecked,
    configError,
    isConfigured: isFirebaseConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  }
}
