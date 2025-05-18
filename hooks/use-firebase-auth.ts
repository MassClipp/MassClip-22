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
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, isFirebaseConfigured, db } from "@/lib/firebase"

// Update the return type to include success and error
interface AuthResult {
  success: boolean
  error?: string
  demo?: boolean
}

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
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
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
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Using demo mode.")
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      setLoading(true)
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      console.log("Google sign in successful, user:", user.uid)

      // Check if username is already taken
      if (username) {
        console.log("Checking if username exists:", username)
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          console.log("Username already exists")
          return { success: false, error: "Username is already taken" }
        }
      }

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      // If user doesn't exist in Firestore, create a new document
      if (!userDoc.exists()) {
        console.log("Creating new user document for:", user.uid)
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: displayName || user.displayName,
          username: username,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          plan: "free",
          permissions: { download: false, premium: false },
        })

        // Create username document
        if (username) {
          console.log("Creating username document:", username)
          await setDoc(doc(db, "usernames", username), {
            uid: user.uid,
            createdAt: serverTimestamp(),
          })

          // Create creator profile
          console.log("Creating creator profile for:", username)
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
      } else {
        // If user exists but doesn't have a username yet
        const userData = userDoc.data()
        if (!userData.username && username) {
          console.log("Updating existing user with username:", username)
          await setDoc(
            doc(db, "users", user.uid),
            {
              username: username,
              displayName: displayName || user.displayName,
            },
            { merge: true },
          )

          // Create username document
          console.log("Creating username document for existing user:", username)
          await setDoc(doc(db, "usernames", username), {
            uid: user.uid,
            createdAt: serverTimestamp(),
          })

          // Create creator profile
          console.log("Creating creator profile for existing user:", username)
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
    } catch (err) {
      console.error("Error signing in with Google:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
      return { success: false, error: err instanceof Error ? err.message : "Failed to sign in with Google" }
    } finally {
      setLoading(false)
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
      setLoading(true)

      console.log("Starting signup process with:", { email, username, displayName })

      // Check if username is already taken
      if (username) {
        console.log("Checking if username exists:", username)
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          console.log("Username already exists")
          return { success: false, error: "Username is already taken" }
        }
      }

      console.log("Creating user with email and password")
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      console.log("User created:", user.uid)

      // Create user document in Firestore
      console.log("Creating user document")
      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName: displayName || null,
        username: username || null,
        createdAt: serverTimestamp(),
        plan: "free",
        permissions: { download: false, premium: false },
      })

      // Create username document
      if (username) {
        console.log("Creating username document:", username)
        await setDoc(doc(db, "usernames", username), {
          uid: user.uid,
          createdAt: serverTimestamp(),
        })

        // Create creator profile
        console.log("Creating creator profile:", username)
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

      console.log("Signup process completed successfully")
      return { success: true }
    } catch (err) {
      console.error("Error signing up:", err)
      setError(err instanceof Error ? err.message : "Failed to sign up")
      return { success: false, error: err instanceof Error ? err.message : "Failed to sign up" }
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
