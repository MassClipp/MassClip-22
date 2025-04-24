/**
 * Script to verify user permissions after migration
 * Run with: npx ts-node -r tsconfig-paths/register scripts/verify-user-permissions.ts
 */
import * as admin from "firebase-admin"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
    console.log("Firebase Admin initialized successfully")
  } catch (error) {
    console.error("Firebase Admin initialization error:", error)
    process.exit(1)
  }
}

const db = admin.firestore()

async function verifyUserPermissions() {
  console.log("Starting user permissions verification...")

  try {
    // Get all user documents
    const usersSnapshot = await db.collection("users").get()
    console.log(`Found ${usersSnapshot.size} user documents to verify`)

    let validUsers = 0
    let invalidUsers = 0
    const issues: { userId: string; issues: string[] }[] = []

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id
      const userIssues: string[] = []

      // Check required fields
      if (userData.plan !== "free" && userData.plan !== "pro") {
        userIssues.push(`Invalid plan: ${userData.plan}`)
      }

      if (typeof userData.downloads !== "number") {
        userIssues.push("Missing or invalid downloads field")
      }

      if (!userData.lastReset) {
        userIssues.push("Missing lastReset timestamp")
      }

      // Check for conflicting fields
      if (userData.Free !== undefined || userData.Pro !== undefined) {
        userIssues.push("Has legacy plan fields (Free/Pro)")
      }

      if (userData.permissions !== undefined) {
        userIssues.push("Has legacy permissions field")
      }

      if (userData.downloadLimit !== undefined || userData.downloadCount !== undefined) {
        userIssues.push("Has legacy download fields")
      }

      // Track results
      if (userIssues.length > 0) {
        invalidUsers++
        issues.push({ userId, issues: userIssues })
      } else {
        validUsers++
      }
    }

    console.log("\nVerification Results:")
    console.log(`Total users: ${usersSnapshot.size}`)
    console.log(`Valid users: ${validUsers}`)
    console.log(`Invalid users: ${invalidUsers}`)

    if (invalidUsers > 0) {
      console.log("\nUsers with issues:")
      issues.forEach(({ userId, issues }) => {
        console.log(`\nUser ${userId}:`)
        issues.forEach((issue) => console.log(`- ${issue}`))
      })
    }
  } catch (error) {
    console.error("Verification failed:", error)
  }
}

// Run the verification
verifyUserPermissions()
  .then(() => {
    console.log("Verification completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Verification failed:", error)
    process.exit(1)
  })
