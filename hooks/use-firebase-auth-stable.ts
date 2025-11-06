"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { initializeApp, getApps, getApp } from "firebase/app"

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase app if it hasn't been initialized yet
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)

interface AuthResult {
  success: boolean
  error?: string
}

export function useFirebaseAuthStable() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Use refs to prevent race conditions
  const userRef = useRef<User | null>(null)
  const sessionSetRef = useRef<boolean>(false)

  // Set session cookie on the server with detailed debugging
  const setSessionCookie = async (idToken: string) => {
    try {
      console.log("🔑 Starting session cookie setup...")
      console.log("🔑 ID Token length:", idToken?.length || 0)
      console.log("🔑 ID Token preview:", idToken?.substring(0, 50) + "...")

      const response = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      console.log("🔑 Response status:", response.status)
      console.log("🔑 Response ok:", response.ok)

      const data = await response.json()
      console.log("🔑 Response data:", data)

      if (data.success) {
        console.log("✅ Session cookie set successfully")
        sessionSetRef.current = true
        return true
      } else {
        console.error("❌ Failed to set session cookie:", data.error)
        return false
      }
    } catch (error) {
      console.error("❌ Error setting session cookie:", error)
      return false
    }
  }

  // Setup auth state listener with debounce
  useEffect(() => {
    console.log("🔄 Setting up stable auth state listener...")
    let timeoutId: NodeJS.Timeout | null = null

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log(`🔄 Auth state changed: ${authUser ? `User: ${authUser.email}` : "No user"}`)

      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Set a timeout to update state after a short delay to avoid rapid changes
      timeoutId = setTimeout(async () => {
        const previousUser = userRef.current
        userRef.current = authUser
        setUser(authUser)

        // If user just logged in and we haven't set the session yet
        if (authUser && !previousUser && !sessionSetRef.current) {
          console.log("🔑 New user login detected, setting session cookie...")
          try {
            const idToken = await authUser.getIdToken()
            console.log("🔑 Got ID token, calling setSessionCookie...")
            await setSessionCookie(idToken)
          } catch (error) {
            console.error("❌ Error getting ID token:", error)
          }
        }

        setAuthChecked(true)
        setLoading(false)
        setIsInitialized(true)
        console.log(`✅ Auth state stabilized: ${authUser ? "Logged in" : "Logged out"}`)
      }, 100)
    })

    return () => {
      console.log("🧹 Cleaning up auth listener")
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      console.log("🔐 Starting email sign in...")
      sessionSetRef.current = false // Reset session flag

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("🔐 Email sign in successful, getting ID token...")

      const idToken = await userCredential.user.getIdToken()
      console.log("🔐 Got ID token, setting session cookie...")

      const sessionResult = await setSessionCookie(idToken)
      console.log("🔐 Session cookie result:", sessionResult)

      return { success: true }
    } catch (error: any) {
      console.error("❌ Sign in error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in",
      }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      console.log("📝 Starting email sign up...")
      sessionSetRef.current = false // Reset session flag

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log("📝 Email sign up successful, getting ID token...")

      const idToken = await userCredential.user.getIdToken()
      console.log("📝 Got ID token, setting session cookie...")

      const sessionResult = await setSessionCookie(idToken)
      console.log("📝 Session cookie result:", sessionResult)

      return { success: true }
    } catch (error: any) {
      console.error("❌ Sign up error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign up",
      }
    }
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      console.log("🔐 Starting Google sign in...")
      sessionSetRef.current = false // Reset session flag

      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      console.log("🔐 Google sign in successful, getting ID token...")

      const idToken = await userCredential.user.getIdToken()
      console.log("🔐 Got ID token, setting session cookie...")

      const sessionResult = await setSessionCookie(idToken)
      console.log("🔐 Session cookie result:", sessionResult)

      return { success: true }
    } catch (error: any) {
      console.error("❌ Google sign in error:", error)
      return {
        success: false,
        error: error.message || "Failed to sign in with Google",
      }
    }
  }, [])

  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      await firebaseSignOut(auth)
      sessionSetRef.current = false
      // Clear session cookie
      await fetch("/api/auth/clear-session", { method: "POST" })
      return { success: true }
    } catch (error: any) {
      console.error("Sign out error:", error)
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
    isInitialized,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  }
}
