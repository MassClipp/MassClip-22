import { auth } from "@/lib/firebase"
import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth"

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider()

  try {
    console.log("Setting persistence to local...")
    await setPersistence(auth, browserLocalPersistence)

    console.log("Opening Google sign-in popup...")
    const result = await signInWithPopup(auth, provider)
    const user = result.user
    console.log("User signed in successfully:", user.email)
    return { success: true, user }
  } catch (err: any) {
    if (err.code === "auth/popup-closed-by-user") {
      console.warn("Popup was closed by user or browser")
    } else {
      console.error("Login error:", err.code, err.message)
    }
    return { success: false, error: err }
  }
}
