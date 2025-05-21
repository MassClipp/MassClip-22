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
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import { auth, isFirebaseConfigured, db } from "@/lib/firebase"
import { ensureAllUserSubcollectionsExist } from "@/lib/subcollection-utils"

// Update the return type to include success and error
interface AuthResult {
  success: boolean
  error?: string
  demo?: boolean
  username?: string
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
      async (authUser) => {
        if (authUser) {
          setUser(authUser)

          // Ensure subcollections exist whenever user logs in
          try {
            await ensureAllUserSubcollectionsExist(authUser.uid)
          } catch (err) {
            console.error("Error ensuring subcollections on auth state change:", err)
          }
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

  // Create session cookie
  const createSession = async (user: User) => {
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

      console.log("Session created successfully")
      return true
    } catch (error) {
      console.error("Error creating session:", error)
      return false
    }
  }

  // Check if username is available
  const isUsernameAvailable = async (username: string): Promise<boolean> => {
    if (!username) return false

    try {
      // Query users collection to check if username exists
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("username", "==", username.toLowerCase()))
      const querySnapshot = await getDocs(q)

      return querySnapshot.empty
    } catch (error) {
      console.error("[Auth] Error checking username availability:", error)
      return false
    }
  }

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
      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // Create session cookie
      await createSession(userCredential.user)

      // Get the user's username from Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
      const username = userDoc.exists() ? userDoc.data().username : null

      // Ensure subcollections exist (in case they were not created during signup)
      await ensureAllUserSubcollectionsExist(userCredential.user.uid)

      return { success: true, username }
    } catch (err) {
      console.error("[Auth] Error signing in:", err)
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

      // Create session cookie
      await createSession(user)

      console.log("[Auth] Google sign in successful, user:", user.uid)

      // Check if username is already taken (if provided)
      if (username) {
        console.log("[Auth] Checking if username is available:", username)
        const available = await isUsernameAvailable(username)
        if (!available) {
          console.log("[Auth] Username already exists")
          return { success: false, error: "Username is already taken" }
        }
      }

      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))
      let existingUsername = null

      // If user exists, get their username
      if (userDoc.exists()) {
        const userData = userDoc.data()
        existingUsername = userData.username

        // If user exists but doesn't have a username yet
        if (!existingUsername && username) {
          console.log("[Auth] Updating existing user with username:", username)

          // Update user document with username
          await setDoc(
            doc(db, "users", user.uid),
            {
              username: username.toLowerCase(),
              displayName: displayName || user.displayName,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          )

          existingUsername = username.toLowerCase()
        }

        // Ensure subcollections exist
        await ensureAllUserSubcollectionsExist(user.uid)
      } else {
        // Create new user document
        console.log("[Auth] Creating new user document for:", user.uid)

        const lowerUsername = username ? username.toLowerCase() : null
        console.log("[Auth] Using lowercase username:", lowerUsername)

        const newUserData = {
          email: user.email,
          displayName: displayName || user.displayName,
          username: lowerUsername,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          plan: "free",
          permissions: { download: false, premium: false },
          bio: "",
        }

        await setDoc(doc(db, "users", user.uid), newUserData)

        // Initialize subcollections
        await ensureAllUserSubcollectionsExist(user.uid)

        existingUsername = lowerUsername
      }

      return { success: true, username: existingUsername }
    } catch (err) {
      console.error("[Auth] Error signing in with Google:", err)
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
      return { success: true, demo: true, username }
    }

    setError(null)
    try {
      setLoading(true)

      console.log("[Auth] Starting signup process with:", { email, username, displayName })

      // Check if username is already taken
      if (username) {
        console.log("[Auth] Checking if username is available:", username)
        const available = await isUsernameAvailable(username)
        if (!available) {
          console.log("[Auth] Username already exists")
          return { success: false, error: "Username is already taken" }
        }
      }

      console.log("[Auth] Creating user with email and password")
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      console.log("[Auth] User created:", user.uid)

      // Create session cookie
      await createSession(user)

      // Create user document in Firestore
      console.log("[Auth] Creating user document")

      const lowerUsername = username ? username.toLowerCase() : null
      console.log("[Auth] Using lowercase username:", lowerUsername)

      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName: displayName || null,
        username: lowerUsername,
        createdAt: serverTimestamp(),
        plan: "free",
        permissions: { download: false, premium: false },
        bio: "",
        photoURL: null,
      })

      // Initialize subcollections - critical step to prevent permission errors
      console.log("[Auth] Initializing subcollections")
      await ensureAllUserSubcollectionsExist(user.uid)

      console.log("[Auth] Signup process completed successfully")
      return { success: true, username: lowerUsername }
    } catch (err) {
      console.error("[Auth] Error signing up:", err)
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
      // Clear session cookie
      await fetch("/api/logout", {
        method: "POST",
      })

      await signOut(auth)

      // Force redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return { success: true }
    } catch (err) {
      console.error("[Auth] Error signing out:", err)
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
      console.error("[Auth] Error resetting password:", err)
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
