import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
initializeFirebaseAdmin()
const db = getFirestore()

/**
 * Script to fix inconsistencies between "creator-pro" and "creator_pro" plan names
 * This will standardize all plan names to use "creator_pro" (with underscore)
 */
async function fixPlanInconsistencies() {
  console.log("Starting plan name standardization...")

  try {
    // Find all users with plan="creator-pro" (hyphen)
    const usersWithHyphen = await db.collection("users").where("plan", "==", "creator-pro").get()

    console.log(`Found ${usersWithHyphen.size} users with plan="creator-pro" (hyphen)`)

    if (!usersWithHyphen.empty) {
      // Update each user to use underscore
      const batch = db.batch()
      let count = 0

      usersWithHyphen.forEach((doc) => {
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

      console.log(`Successfully standardized ${count} users from "creator-pro" to "creator_pro"`)
    }

    // Now check for any subscriptions with the wrong plan name
    const subscriptionsSnapshot = await db.collectionGroup("subscriptions").where("plan", "==", "creator-pro").get()

    console.log(`Found ${subscriptionsSnapshot.size} subscriptions with plan="creator-pro" (hyphen)`)

    if (!subscriptionsSnapshot.empty) {
      const subBatch = db.batch()
      let subCount = 0

      subscriptionsSnapshot.forEach((doc) => {
        subBatch.update(doc.ref, { plan: "creator_pro" })
        subCount++

        if (subCount % 500 === 0) {
          console.log(`Committing batch of ${subCount} subscription updates`)
          subBatch.commit()
        }
      })

      if (subCount % 500 !== 0) {
        console.log(`Committing final batch of ${subCount % 500} subscription updates`)
        await subBatch.commit()
      }

      console.log(`Successfully standardized ${subCount} subscriptions from "creator-pro" to "creator_pro"`)
    }

    console.log("Plan name standardization completed successfully")
  } catch (error) {
    console.error("Error during plan name standardization:", error)
    throw error
  }
}

// Run the script
fixPlanInconsistencies()
  .then(() => console.log("Script completed successfully"))
  .catch((error) => console.error("Script failed:", error))
  .finally(() => process.exit())
