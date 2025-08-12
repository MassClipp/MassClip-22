import { db } from "@/lib/firebase-admin"

interface UserProfile {
  uid: string
  email?: string
}

async function createFreeUsersCollection() {
  console.log("🚀 Creating freeUsers collection for existing users...")

  try {
    // Get all existing user profiles
    const profilesSnapshot = await db.collection("userProfiles").get()

    if (profilesSnapshot.empty) {
      console.log("No user profiles found")
      return
    }

    const batch = db.batch()
    let count = 0

    for (const doc of profilesSnapshot.docs) {
      const profile = doc.data() as UserProfile

      // Check if free user record already exists
      const freeUserRef = db.collection("freeUsers").doc(profile.uid)
      const existingFreeUser = await freeUserRef.get()

      if (!existingFreeUser.exists()) {
        // Create free user record
        const freeUserData = {
          uid: profile.uid,
          email: profile.email || "",
          downloadsUsed: 0,
          downloadsLimit: 5,
          bundlesCreated: 0,
          bundlesLimit: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        batch.set(freeUserRef, freeUserData)
        count++

        console.log(`✅ Queued free user creation for: ${profile.uid}`)
      }
    }

    if (count > 0) {
      await batch.commit()
      console.log(`🎉 Successfully created ${count} free user records`)
    } else {
      console.log("All users already have free user records")
    }
  } catch (error) {
    console.error("❌ Error creating free users collection:", error)
    throw error
  }
}

// Run the script
createFreeUsersCollection()
  .then(() => {
    console.log("✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Script failed:", error)
    process.exit(1)
  })
