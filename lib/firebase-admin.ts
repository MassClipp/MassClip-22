import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

/**
 * Initializes Firebase Admin SDK if it hasn't been initialized already
 * This prevents multiple initializations in serverless environments
 */
export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Check for required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing Firebase Admin SDK credentials in environment variables")
      console.error("Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY")
      throw new Error("Firebase Admin SDK credentials are required")
    }

    try {
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId, // Explicitly set project ID
      })
      console.log("✅ Firebase Admin SDK initialized successfully")
      return app
    } catch (error) {
      console.error("❌ Error initializing Firebase Admin SDK:", error)
      throw error
    }
  } else {
    console.log("✅ Firebase Admin SDK already initialized")
    return getApps()[0]
  }
}

// Initialize Firebase Admin if not already initialized
let adminApp: any = null
let adminDb: any = null
let adminAuth: any = null

try {
  adminApp = initializeFirebaseAdmin()
  adminDb = getFirestore(adminApp)
  adminAuth = getAuth(adminApp)

  // Configure Firestore settings for better reliability
  adminDb.settings({
    ignoreUndefinedProperties: true,
  })
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error)
}

// Export the Firestore database using Admin SDK
export const db = adminDb

// Export the Auth service
export const auth = adminAuth

// Export FieldValue for serverTimestamp and other field operations
export { FieldValue }

/**
 * Verifies a Firebase ID token and returns the decoded token
 * @param idToken - The Firebase ID token to verify
 * @returns Promise<DecodedIdToken> - The decoded token containing user information
 */
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    console.error("Error verifying ID token:", error)
    throw new Error("Invalid or expired token")
  }
}

/**
 * Helper function to get authenticated user from request headers
 * @param headers - Request headers containing authorization
 * @returns Promise<{uid: string, email?: string}> - User information
 */
export async function getAuthenticatedUser(headers: Headers) {
  const authHeader = headers.get("authorization")
  const userIdHeader = headers.get("x-user-id")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header")
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    const decodedToken = await verifyIdToken(token)

    // Verify the user ID matches if provided
    if (userIdHeader && decodedToken.uid !== userIdHeader) {
      throw new Error("User ID mismatch")
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    throw new Error("Authentication failed")
  }
}

// Helper function to retry Firestore operations
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Firestore] Attempt ${attempt}/${maxRetries}`)
      const result = await operation()
      if (attempt > 1) {
        console.log(`✅ [Firestore] Operation succeeded on attempt ${attempt}`)
      }
      return result
    } catch (error) {
      lastError = error as Error
      console.error(`❌ [Firestore] Attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        console.log(`⏳ [Firestore] Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff
      }
    }
  }

  throw lastError
}

/**
 * Create or update user profile in Firestore
 */
export async function createOrUpdateUserProfile(userId: string, profileData: any) {
  return withRetry(async () => {
    const userRef = db.collection("users").doc(userId)

    // Check if user exists
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      // Update existing user
      await userRef.update({
        ...profileData,
        updatedAt: new Date(),
      })
      console.log(`✅ Updated user profile for ${userId}`)
    } else {
      // Create new user
      await userRef.set({
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log(`✅ Created new user profile for ${userId}`)
    }

    return userRef.id
  })
}

/**
 * Create or update creator profile in Firestore
 */
export async function createOrUpdateCreatorProfile(username: string, profileData: any) {
  if (!username) return

  return withRetry(async () => {
    const creatorRef = db.collection("creators").doc(username.toLowerCase())

    // Check if creator exists
    const creatorDoc = await creatorRef.get()

    if (creatorDoc.exists) {
      // Update existing creator
      await creatorRef.update({
        ...profileData,
        updatedAt: new Date(),
      })
      console.log(`✅ Updated creator profile for ${username}`)
    } else {
      // Create new creator
      await creatorRef.set({
        ...profileData,
        username: username.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log(`✅ Created new creator profile for ${username}`)
    }

    return creatorRef.id
  })
}
