"use client"

import { useState, useEffect } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  getAuth,
} from "firebase/auth"
import { doc, getDoc, setDoc, getFirestore, serverTimestamp } from "firebase/firestore"
import { auth, isFirebaseConfigured } from "@/lib/firebase"

// Update the return type to include success and error
interface AuthResult {
  success: boolean
  error?: string
}

// Update the hook to include the new parameters
export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen for auth state changes
  useEffect(() => {
    // Skip if Firebase is not configured
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Auth functionality will be limited.")
      setLoading(false)
      return () => {}
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (authUser) => {
        if (authUser) {
          setUser(authUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Auth state change error:", error)
        setError(error.message)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      // Simulate successful login for demo/preview purposes
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      setLoading(true)
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (err) {
      console.error("Error signing in:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in")
      return { success: false, error: err instanceof Error ? err.message : "Failed to sign in" }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async (username?: string, displayName?: string): Promise<AuthResult> => {
    try {
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
          createdAt: serverTimestamp(),
          plan: "free",
          permissions: { download: false, premium: false },
          bio: "",
          profilePic: user.photoURL || "",
          freeClips: [],
          paidClips: [],
        }

        await setDoc(doc(db, "users", user.uid), userData)

        // If username is provided, also create a document in the usernames collection
        if (username) {
          await setDoc(doc(db, "usernames", username), {
            uid: user.uid,
            createdAt: serverTimestamp(),
          })

          // Create a document in the creators collection
          await setDoc(doc(db, "creators", username), {
            uid: user.uid,
            username,
            displayName: displayName || user.displayName || username,
            createdAt: serverTimestamp(),
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
    }
  }

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    username?: string,
    displayName?: string,
  ): Promise<AuthResult> => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      // Simulate successful signup for demo/preview purposes
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      const auth = getAuth()
      const db = getFirestore()

      // Check if username is already taken
      if (username) {
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          return { success: false, error: "Username is already taken" }
        }
      }

      // Create the user in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password)

      // Create user document in Firestore
      const userData = {
        email,
        displayName: displayName || null,
        username: username || null,
        createdAt: serverTimestamp(),
        plan: "free",
        permissions: { download: false, premium: false },
        bio: "",
        profilePic: "",
        freeClips: [],
        paidClips: [],
      }

      await setDoc(doc(db, "users", user.uid), userData)

      // If username is provided, also create a document in the usernames collection
      if (username) {
        await setDoc(doc(db, "usernames", username), {
          uid: user.uid,
          createdAt: serverTimestamp(),
        })

        // Create a document in the creators collection
        await setDoc(doc(db, "creators", username), {
          uid: user.uid,
          username,
          displayName: displayName || username,
          createdAt: serverTimestamp(),
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

  // Sign out
  const logOut = async () => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      setUser(null)

      // Force redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return { success: true, demo: true }
    }

    setError(null)
    try {
      await signOut(auth)

      // Force redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return { success: true }
    } catch (err) {
      console.error("Error signing out:", err)
      setError(err instanceof Error ? err.message : "Failed to sign out")
      return { success: false, error: err instanceof Error ? err.message : "Failed to sign out" }
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      return { success: true, demo: true }
    }

    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (err) {
      console.error("Error resetting password:", err)
      setError(err instanceof Error ? err.message : "Failed to reset password")
      return { success: false, error: err instanceof Error ? err.message : "Failed to reset password" }
    }
  }

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    logOut,
    resetPassword,
    isFirebaseConfigured,
  }
}
