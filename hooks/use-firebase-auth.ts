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

  // Save creator profile to Firestore
  const saveCreatorProfile = async (uid: string, username: string, displayName: string, photoURL?: string) => {
    console.log(`Saving creator profile for ${username}...`)

    try {
      // Create creator profile
      await setDoc(doc(db, "creators", username), {
        uid: uid,
        username: username,
        displayName: displayName || username,
        bio: "",
        profilePic: photoURL || "",
        freeClips: [],
        paidClips: [],
        createdAt: serverTimestamp(),
      })

      // Create username document for uniqueness check
      await setDoc(doc(db, "usernames", username), {
        uid: uid,
        createdAt: serverTimestamp(),
      })

      console.log(`Creator profile saved successfully for ${username}`)
      return true
    } catch (error) {
      console.error("Error saving creator profile:", error)
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

      // Get the user's username from Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
      const username = userDoc.exists() ? userDoc.data().username : null

      // Redirect will be handled by the auth context in the component

      return { success: true, username }
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
      let existingUsername = null

      // If user exists, get their username
      if (userDoc.exists()) {
        const userData = userDoc.data()
        existingUsername = userData.username

        // If user exists but doesn't have a username yet
        if (!existingUsername && username) {
          console.log("Updating existing user with username:", username)

          // Update user document with username
          await setDoc(
            doc(db, "users", user.uid),
            {
              username: username,
              displayName: displayName || user.displayName,
            },
            { merge: true },
          )

          // Create creator profile
          await saveCreatorProfile(user.uid, username, displayName || user.displayName || username, user.photoURL || "")
          existingUsername = username
        }
      } else {
        // Create new user document
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

        // Create creator profile
        if (username) {
          await saveCreatorProfile(user.uid, username, displayName || user.displayName || username, user.photoURL || "")
          existingUsername = username
        }
      }

      return { success: true, username: existingUsername }
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
      return { success: true, demo: true, username }
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

      // Create creator profile
      if (username) {
        await saveCreatorProfile(user.uid, username, displayName || username)
      }

      console.log("Signup process completed successfully")
      return { success: true, username }
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
