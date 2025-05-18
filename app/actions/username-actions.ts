"use server"

import { db } from "@/lib/firebase-admin"

/**
 * Server action to check if a username is available
 */
export async function checkUsernameAvailability(username: string) {
  try {
    // Basic validation
    if (username.length < 3) {
      return { available: false, message: "Username must be at least 3 characters" }
    }

    if (username.length > 30) {
      return { available: false, message: "Username must be less than 30 characters" }
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return { available: false, message: "Username can only contain lowercase letters, numbers, and underscores" }
    }

    // Check if username exists in Firestore
    const snapshot = await db.collection("creatorProfiles").where("username", "==", username.toLowerCase()).get()

    if (snapshot.empty) {
      return { available: true, message: "Username is available" }
    } else {
      return { available: false, message: "Username is already taken" }
    }
  } catch (error) {
    console.error("Error checking username availability:", error)
    return {
      available: false,
      message: "Error checking username. Please try again.",
      error: true,
    }
  }
}

/**
 * Server action to reserve a username temporarily
 */
export async function reserveUsername(username: string, userId: string) {
  try {
    // First check if username is available
    const { available } = await checkUsernameAvailability(username)

    if (!available) {
      return { success: false, message: "Username is not available" }
    }

    // Create a temporary reservation in a separate collection
    await db
      .collection("usernameReservations")
      .doc(username.toLowerCase())
      .set({
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      })

    return { success: true }
  } catch (error) {
    console.error("Error reserving username:", error)
    return { success: false, message: "Error reserving username" }
  }
}
