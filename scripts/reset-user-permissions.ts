/**
 * Migration script to reset all user documents to align with the new permissions system
 * Run with: npx ts-node -r tsconfig-paths/register scripts/reset-user-permissions.ts
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
        // The private key needs to be properly formatted as it comes as a string with "\n" characters
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

async function resetUserPermissions() {
  console.log("Starting user permissions reset...")

  try {
    // Get all user documents
    const usersSnapshot = await db.collection("users").get()
    console.log(`Found ${usersSnapshot.size} user documents to process`)

    let freeCount = 0
    let proCount = 0
    let errorCount = 0

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data()
        const userId = userDoc.id

        // Determine if user is pro
        const isPro =
          userData.pro === true ||
          userData.plan === "pro" ||
          userData.plan === "Pro" ||
          (userData.subscriptionStatus &&
            (userData.subscriptionStatus === "active" || userData.subscriptionStatus === "trialing"))

        // Prepare the update data
        const updateData = {
          plan: isPro ? "pro" : "free",
          downloads: 0,
          totalDownloads: userData.totalDownloads || 0,
          lastReset: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        // Remove any conflicting fields
        const fieldsToDelete = {
          Free: admin.firestore.FieldValue.delete(),
          Pro: admin.firestore.FieldValue.delete(),
          permissions: admin.firestore.FieldValue.delete(),
          downloadLimit: admin.firestore.FieldValue.delete(),
          downloadCount: admin.firestore.FieldValue.delete(),
        }

        // Merge the updates with fields to delete
        const mergedUpdate = { ...updateData, ...fieldsToDelete }

        // Update the document
        await db.collection("users").doc(userId).update(mergedUpdate)

        // Count the updates
        if (isPro) {
          proCount++
          console.log(`Updated pro user: ${userId}`)
        } else {
          freeCount++
          console.log(`Updated free user: ${userId}`)
        }
      } catch (err) {
        errorCount++
        console.error(`Error updating user ${userDoc.id}:`, err)
      }
    }

    console.log("\nMigration Summary:")
    console.log(`Total users processed: ${usersSnapshot.size}`)
    console.log(`Free users updated: ${freeCount}`)
    console.log(`Pro users updated: ${proCount}`)
    console.log(`Errors encountered: ${errorCount}`)
    console.log("\nMigration completed!")
  } catch (error) {
    console.error("Migration failed:", error)
  }
}

// Run the migration
resetUserPermissions()
  .then(() => {
    console.log("Script execution completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Script execution failed:", error)
    process.exit(1)
  })
