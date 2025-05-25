"use client"

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth"
import { auth } from "./firebase"

// Enhanced logging for auth operations
const logAuth = (operation: string, data?: any) => {
  console.log(`[AUTH ${new Date().toISOString()}] ${operation}`, data || "")
}

export async function signIn(email: string, password: string) {
  try {
    logAuth("Attempting sign in", { email })
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    logAuth("Sign in successful", {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      isAnonymous: userCredential.user.isAnonymous,
      emailVerified: userCredential.user.emailVerified,
    })
    return { success: true, user: userCredential.user }
  } catch (error: any) {
    logAuth("Sign in failed", { error })
    let message = "Failed to sign in"

    // Map Firebase error codes to user-friendly messages
    if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      message = "Invalid email or password"
    } else if (error.code === "auth/too-many-requests") {
      message = "Too many failed login attempts. Please try again later."
    } else if (error.code === "auth/user-disabled") {
      message = "This account has been disabled"
    }

    return { success: false, error: message }
  }
}

export async function signUp(email: string, password: string) {
  try {
    logAuth("Attempting sign up", { email })
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    logAuth("Sign up successful", { uid: userCredential.user.uid })
    return { success: true, user: userCredential.user }
  } catch (error: any) {
    logAuth("Sign up failed", { error })
    let message = "Failed to create account"

    if (error.code === "auth/email-already-in-use") {
      message = "Email already in use"
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address"
    } else if (error.code === "auth/weak-password") {
      message = "Password is too weak"
    }

    return { success: false, error: message }
  }
}

export async function signOut() {
  try {
    logAuth("Attempting sign out")
    await firebaseSignOut(auth)
    logAuth("Sign out successful")
    return { success: true }
  } catch (error) {
    logAuth("Sign out failed", { error })
    return { success: false, error: "Failed to sign out" }
  }
}

export async function loginWithGoogle() {
  try {
    logAuth("Attempting Google sign in with popup")
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)

    // Log detailed user info
    logAuth("Google sign in successful", {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      isNewUser: result._tokenResponse?.isNewUser,
    })

    // Verify auth state is updated
    setTimeout(() => {
      if (auth.currentUser) {
        logAuth("Auth state confirmed after Google login", {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
        })
      } else {
        logAuth("Warning: auth.currentUser is null after Google login")
      }
    }, 500)

    return { success: true, user: result.user }
  } catch (error: any) {
    logAuth("Google sign in failed", { error })
    return { success: false, error }
  }
}

export async function loginWithGoogleRedirect() {
  try {
    logAuth("Attempting Google sign in with redirect")
    const provider = new GoogleAuthProvider()
    await signInWithRedirect(auth, provider)
    return { success: true }
  } catch (error) {
    logAuth("Google redirect failed", { error })
    return { success: false, error }
  }
}

export async function getGoogleRedirectResult(): Promise<{ success: boolean; user?: any; error?: any }> {
  try {
    logAuth("Getting Google redirect result")
    const result = await getRedirectResult(auth)

    if (result) {
      logAuth("Google redirect result successful", {
        uid: result.user.uid,
        email: result.user.email,
      })
      return { success: true, user: result.user }
    }

    logAuth("No Google redirect result")
    return { success: false }
  } catch (error) {
    logAuth("Error getting Google redirect result", { error })
    return { success: false, error }
  }
}
