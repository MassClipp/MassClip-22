import { db } from "@/lib/firebase-admin"
import { createFreeUser } from "@/lib/free-users-service"

async function createFreeUsersCollection() {
  console.log("🔄 Creating freeUsers collection and setting up indexes...")

  try {
    // Get all user profiles to create free user records
    const profilesSnapshot = await db.collection("userProfiles").get()

    let created = 0
    let skipped = 0

    for (const doc of profilesSnapshot.docs) {
      const profile = doc.data()
      const uid = doc.id

      // Check if free user already exists
      const existingFreeUser = await db.collection("freeUsers").doc(uid).get()
      if (existingFreeUser.exists) {
        skipped++
        continue
      }

      // Check if user has active membership (skip if they do)
      const membership = await db.collection("memberships").doc(uid).get()
      if (membership.exists && membership.data()?.isActive) {
        console.log(`⏭️ Skipping ${uid} - has active membership`)
        skipped++
        continue
      }

      // Create free user record
      await createFreeUser(uid, profile.email || "")
      created++

      if (created % 10 === 0) {
        console.log(`✅ Created ${created} free user records...`)
      }
    }

    console.log(`✅ Completed! Created: ${created}, Skipped: ${skipped}`)
  } catch (error) {
    console.error("❌ Error creating free users collection:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  createFreeUsersCollection()
    .then(() => {
      console.log("✅ Script completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Script failed:", error)
      process.exit(1)
    })
}

export { createFreeUsersCollection }
