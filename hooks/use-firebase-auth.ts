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
import { doc, getDoc, setDoc, serverTimestamp, getFirestore } from "firebase/firestore"
import { initializeFirebaseApp } from "@/lib/firebase"

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
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize Firebase
  useEffect(() => {
    try {
      initializeFirebaseApp()
      setIsInitialized(true)
      console.log("Firebase initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase:", error)
      setIsInitialized(false)
    }
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    if (!isInitialized) {
      return () => {}
    }

    try {
      const auth = getAuth()
      console.log("Setting up auth state listener")

      const unsubscribe = onAuthStateChanged(
        auth,
        (authUser) => {
          if (authUser) {
            console.log("User is signed in:", authUser.uid)
            setUser(authUser)
          } else {
            console.log("No user is signed in")
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
    } catch (error) {
      console.error("Error setting up auth state listener:", error)
      setLoading(false)
      return () => {}
    }
  }, [isInitialized])

  // Create session cookie
  const createSession = async (user: User) => {
    try {
      console.log("Creating session for user:", user.uid)
      const idToken = await user.getIdToken()
      const response = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        console.error("Failed to create session, status:", response.status)
        throw new Error("Failed to create session")
      }

      console.log("Session created successfully")
      return true
    } catch (error) {
      console.error("Error creating session:", error)
      return false
    }
  }

  // Save creator profile to Firestore with better error handling
  const saveCreatorProfile = async (uid: string, username: string, displayName: string, photoURL?: string) => {
    console.log(`Saving creator profile for ${username}...`)

    try {
      const db = getFirestore()

      // Create creator profile
      console.log("Creating creator profile document")
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
      console.log("Creating username document")
      await setDoc(doc(db, "usernames", username), {
        uid: uid,
        createdAt: serverTimestamp(),
      })

      console.log(`Creator profile saved successfully for ${username}`)
      return true
    } catch (error) {
      console.error("Error saving creator profile:", error)
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          stack: error.stack,
        })
      }
      return false
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!isInitialized) {
      console.warn("Firebase is not properly initialized. Using demo mode.")
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      setLoading(true)
      console.log("Signing in with email:", email)

      const auth = getAuth()
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("Sign in successful, user:", userCredential.user.uid)

      // Create session cookie
      await createSession(userCredential.user)

      // Get the user's username from Firestore
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
      const username = userDoc.exists() ? userDoc.data().username : null

      return { success: true, username }
    } catch (err) {
      console.error("Error signing in:", err)
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          code: err.code,
          stack: err.stack,
        })
        setError(err.message)
        return { success: false, error: err.message }
      }
      setError("Failed to sign in")
      return { success: false, error: "Failed to sign in" }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async (username?: string, displayName?: string): Promise<AuthResult> => {
    if (!isInitialized) {
      console.warn("Firebase is not properly initialized. Using demo mode.")
      setLoading(false)
      return { success: true, demo: true }
    }

    setError(null)
    try {
      setLoading(true)
      console.log("Signing in with Google")

      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      console.log("Google sign in successful, user:", user.uid)

      // Create session cookie
      await createSession(user)

      // Check if username is already taken
      if (username) {
        console.log("Checking if username exists:", username)
        const db = getFirestore()
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          console.log("Username already exists")
          return { success: false, error: "Username is already taken" }
        }
      }

      // Check if user document exists in Firestore
      const db = getFirestore()
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
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          code: err.code,
          stack: err.stack,
        })
        setError(err.message)
        return { success: false, error: err.message }
      }
      setError("Failed to sign in with Google")
      return { success: false, error: "Failed to sign in with Google" }
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
    if (!isInitialized) {
      console.warn("Firebase is not properly initialized. Using demo mode.")
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
        const db = getFirestore()
        const usernameDoc = await getDoc(doc(db, "usernames", username))
        if (usernameDoc.exists()) {
          console.log("Username already exists")
          return { success: false, error: "Username is already taken" }
        }
      }

      console.log("Creating user with email and password")
      const auth = getAuth()
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      console.log("User created:", user.uid)

      // Create session cookie
      await createSession(user)

      // Create user document in Firestore
      console.log("Creating user document")
      const db = getFirestore()

      try {
        await setDoc(doc(db, "users", user.uid), {
          email,
          displayName: displayName || null,
          username: username || null,
          createdAt: serverTimestamp(),
          plan: "free",
          permissions: { download: false, premium: false },
        })
        console.log("User document created successfully")
      } catch (error) {
        console.error("Error creating user document:", error)
        // Continue with the signup process even if this fails
      }

      // Create creator profile
      if (username) {
        const creatorProfileResult = await saveCreatorProfile(user.uid, username, displayName || username)
        if (!creatorProfileResult) {
          console.warn("Failed to create creator profile, but continuing with signup")
        }
      }

      console.log("Signup process completed successfully")
      return { success: true, username }
    } catch (err) {
      console.error("Error signing up:", err)

      // More detailed error logging
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          code: err.code,
          stack: err.stack,
        })

        // Provide more specific error messages based on Firebase error codes
        if (err.code === "auth/email-already-in-use") {
          return {
            success: false,
            error: "This email is already in use. Please try logging in instead.",
          }
        } else if (err.code === "auth/weak-password") {
          return {
            success: false,
            error: "Password is too weak. Please use a stronger password.",
          }
        } else if (err.code === "auth/invalid-email") {
          return {
            success: false,
            error: "Invalid email address. Please check your email and try again.",
          }
        } else if (err.code === "permission-denied") {
          return {
            success: false,
            error: "Permission denied. This is likely due to Firestore security rules. Please contact support.",
          }
        } else if (err.code === "resource-exhausted") {
          return {
            success: false,
            error: "Resource quota exceeded. Please try again later.",
          }
        }

        setError(err.message)
        return { success: false, error: err.message }
      }

      setError("Failed to sign up")
      return { success: false, error: "Failed to sign up" }
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const logOut = async () => {
    if (!isInitialized) {
      console.warn("Firebase is not properly initialized. Using demo mode.")
      setUser(null)

      // Force redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return { success: true, demo: true }
    }

    setError(null)
    try {
      console.log("Signing out")

      // Clear session cookie
      await fetch("/api/logout", {
        method: "POST",
      })

      const auth = getAuth()
      await signOut(auth)
      console.log("Sign out successful")

      // Force redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }

      return { success: true }
    } catch (err) {
      console.error("Error signing out:", err)
      if (err instanceof Error) {
        setError(err.message)
        return { success: false, error: err.message }
      }
      setError("Failed to sign out")
      return { success: false, error: "Failed to sign out" }
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    if (!isInitialized) {
      console.warn("Firebase is not properly initialized. Using demo mode.")
      return { success: true, demo: true }
    }

    setError(null)
    try {
      console.log("Sending password reset email to:", email)
      const auth = getAuth()
      await sendPasswordResetEmail(auth, email)
      console.log("Password reset email sent successfully")
      return { success: true }
    } catch (err) {
      console.error("Error resetting password:", err)
      if (err instanceof Error) {
        setError(err.message)
        return { success: false, error: err.message }
      }
      setError("Failed to reset password")
      return { success: false, error: "Failed to reset password" }
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
    isFirebaseConfigured: isInitialized,
  }
}
