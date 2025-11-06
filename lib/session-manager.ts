// Session manager to handle token refresh and session maintenance
import { getAuth } from "firebase/auth"

// Session expiration threshold (refresh when less than 1 hour remains)
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

/**
 * Checks if the current session needs refreshing and refreshes if needed
 * @returns Promise<boolean> - True if session was refreshed or is valid, false if refresh failed
 */
export async function checkAndRefreshSession(): Promise<boolean> {
  try {
    const auth = getAuth()
    const currentUser = auth.currentUser

    if (!currentUser) {
      console.log("No user logged in, cannot refresh session")
      return false
    }

    // Get the token result which includes the expiration time
    const tokenResult = await currentUser.getIdTokenResult()

    // Calculate time until expiration
    const expirationTime = new Date(tokenResult.expirationTime).getTime()
    const currentTime = Date.now()
    const timeUntilExpiration = expirationTime - currentTime

    // If token expires soon, refresh it
    if (timeUntilExpiration < REFRESH_THRESHOLD_MS) {
      console.log("Token expiring soon, refreshing...")

      // Force refresh the token
      const newToken = await currentUser.getIdToken(true)

      // Create a new session with the fresh token
      const response = await fetch("/api/auth/refresh-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: newToken }),
        credentials: "include",
      })

      if (!response.ok) {
        console.error("Failed to refresh session:", await response.json())
        return false
      }

      console.log("Session refreshed successfully")
      return true
    }

    // Session is still valid
    console.log("Session is still valid, no refresh needed")
    return true
  } catch (error) {
    console.error("Error checking/refreshing session:", error)
    return false
  }
}

/**
 * Validates the current session by making a lightweight API call
 * @returns Promise<boolean> - True if session is valid, false otherwise
 */
export async function validateSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/validate-session", {
      method: "GET",
      credentials: "include",
    })

    return response.ok
  } catch (error) {
    console.error("Error validating session:", error)
    return false
  }
}
