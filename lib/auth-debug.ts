"use client"

// This file contains helper functions for debugging auth issues

import { signOut } from "firebase/auth"
import { auth } from "./firebase-safe"

// Function to clear all auth state
export async function clearAllAuthState() {
  console.log("🧹 Clearing all auth state...")

  try {
    // 1. Sign out from Firebase
    if (auth) {
      await signOut(auth)
      console.log("✅ Firebase auth state cleared")
    } else {
      console.log("⚠️ Firebase auth not initialized")
    }

    // 2. Clear session cookie
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        console.log("✅ Server session cleared")
      } else {
        console.log("❌ Failed to clear server session:", await response.text())
      }
    } catch (error) {
      console.error("❌ Error clearing server session:", error)
    }

    // 3. Clear localStorage and sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    console.log("✅ Local storage cleared")

    console.log("✅ All auth state cleared successfully!")
    console.log("🔄 Please refresh the page now")

    return true
  } catch (error) {
    console.error("❌ Error clearing auth state:", error)
    return false
  }
}

// Add to window for easy access in console
if (typeof window !== "undefined") {
  // @ts-ignore
  window.clearAllAuthState = clearAllAuthState
}
