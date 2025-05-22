import { cookies } from "next/headers"
import { initializeFirebaseAdmin } from "./firebase-admin"
import { getAuth } from "firebase-admin/auth"

/**
 * Validates a session cookie on the server side
 * @returns The decoded token if valid, null otherwise
 */
export async function validateSessionCookie() {
  try {
    // Get the session cookie
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("session")?.value

    if (!sessionCookie) {
      console.log("No session cookie found")
      return null
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    // Verify the session cookie
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true)
    return decodedToken
  } catch (error) {
    console.error("Error validating session cookie:", error)
    return null
  }
}

/**
 * Gets the current user from the session cookie
 * @returns The user record if valid, null otherwise
 */
export async function getCurrentUser() {
  try {
    const decodedToken = await validateSessionCookie()

    if (!decodedToken) {
      return null
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const auth = getAuth()

    // Get the user record
    const userRecord = await auth.getUser(decodedToken.uid)
    return userRecord
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}
