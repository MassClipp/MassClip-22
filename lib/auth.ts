import { auth } from "@/lib/firebase"
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth"

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider()

  // Force account selection
  provider.setCustomParameters({
    prompt: "select_account",
  })

  try {
    console.log("Setting persistence to local...")
    await setPersistence(auth, browserLocalPersistence)

    console.log("Opening Google sign-in popup...")

    // Add a small delay to ensure the button click is registered
    await new Promise((resolve) => setTimeout(resolve, 100))

    const result = await signInWithPopup(auth, provider)
    const user = result.user
    console.log("User signed in successfully:", user.email)
    return { success: true, user }
  } catch (err: any) {
    if (err.code === "auth/popup-closed-by-user") {
      console.warn("Popup was closed by user or browser")
    } else if (err.code === "auth/popup-blocked") {
      console.error("Popup was blocked by the browser")
      alert(
        "Please allow popups for this site to sign in with Google. Check your browser's address bar for a popup blocker icon.",
      )
    } else {
      console.error("Login error:", err.code, err.message)
    }
    return { success: false, error: err }
  }
}

// Alternative: Try redirect method if popup fails
export const loginWithGoogleRedirect = async () => {
  const provider = new GoogleAuthProvider()

  try {
    console.log("Using redirect method for Google sign-in...")
    const { signInWithRedirect } = await import("firebase/auth")
    await signInWithRedirect(auth, provider)
    // This won't return - the page will redirect
  } catch (err: any) {
    console.error("Redirect login error:", err.code, err.message)
    return { success: false, error: err }
  }
}
