import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

/**
 * Migration script to update all users with plan="pro" to plan="creator_pro"
 */
async function migrateProToCreatorPro() {
  console.log("Starting migration: pro -> creator_pro")

  try {
    // Get all users with plan="pro"
    const usersSnapshot = await db.collection("users").where("plan", "==", "pro").get()

    console.log(`Found ${usersSnapshot.size} users with plan="pro"`)

    if (usersSnapshot.empty) {
      console.log("No users to migrate")
      return
    }

    // Update each user
    const batch = db.batch()
    let count = 0

    usersSnapshot.forEach((doc) => {
      batch.update(doc.ref, { plan: "creator_pro" })
      count++

      // Firestore batches are limited to 500 operations
      if (count % 500 === 0) {
        console.log(`Committing batch of ${count} updates`)
        batch.commit()
      }
    })

    // Commit any remaining updates
    if (count % 500 !== 0) {
      console.log(`Committing final batch of ${count % 500} updates`)
      await batch.commit()
    }

    console.log(`Successfully migrated ${count} users from "pro" to "creator_pro"`)
  } catch (error) {
    console.error("Error during migration:", error)
    throw error
  }
}

// Run the migration
migrateProToCreatorPro()
  .then(() => console.log("Migration completed successfully"))
  .catch((error) => console.error("Migration failed:", error))
  .finally(() => process.exit())
