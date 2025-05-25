import { auth } from "@/lib/firebase"
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"

// Set up persistence to local storage
const setupPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence)
    console.log("Auth persistence set to local")
  } catch (error) {
    console.error("Error setting persistence:", error)
  }
}

// Initialize persistence
setupPersistence()

// Login with Google using popup
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider()

  // Add custom parameters
  provider.setCustomParameters({
    prompt: "select_account",
  })

  try {
    console.log("Opening Google sign-in popup...")

    // Set persistence before sign-in
    await setPersistence(auth, browserLocalPersistence)

    // Small delay to ensure click event is fully processed
    await new Promise((resolve) => setTimeout(resolve, 100))

    const result = await signInWithPopup(auth, provider)
    const user = result.user
    console.log("User signed in:", user.email)

    return {
      success: true,
      user,
    }
  } catch (error: any) {
    console.error("Login error:", error.code, error.message)

    return {
      success: false,
      error,
    }
  }
}

// Login with Google using redirect (fallback)
export const loginWithGoogleRedirect = async () => {
  const provider = new GoogleAuthProvider()

  // Add custom parameters
  provider.setCustomParameters({
    prompt: "select_account",
  })

  try {
    console.log("Redirecting to Google sign-in...")

    // Set persistence before sign-in
    await setPersistence(auth, browserLocalPersistence)

    await signInWithRedirect(auth, provider)

    // This function won't return normally - the page will redirect
    return { success: true }
  } catch (error: any) {
    console.error("Login redirect error:", error.code, error.message)

    return {
      success: false,
      error,
    }
  }
}
