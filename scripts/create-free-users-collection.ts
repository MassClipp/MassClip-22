import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  throw new Error("Missing Firebase Admin credentials")
}

const app = initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore(app)
const auth = getAuth(app)

async function createFreeUsersCollection() {
  try {
    console.log("🔄 Starting free users collection creation...")

    // Get all users from Firebase Auth
    const listUsersResult = await auth.listUsers()
    const users = listUsersResult.users

    console.log(`📊 Found ${users.length} users in Firebase Auth`)

    let created = 0
    let skipped = 0

    for (const user of users) {
      try {
        // Check if free user record already exists
        const freeUserDoc = await db.collection("freeUsers").doc(user.uid).get()

        if (freeUserDoc.exists) {
          console.log(`⏭️  Skipping existing free user: ${user.email}`)
          skipped++
          continue
        }

        // Create free user record
        const freeUserData = {
          uid: user.uid,
          email: user.email || "",
          downloadsUsed: 0,
          downloadsLimit: 10,
          bundlesCreated: 0,
          bundlesLimit: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await db.collection("freeUsers").doc(user.uid).set(freeUserData)

        console.log(`✅ Created free user record for: ${user.email}`)
        created++
      } catch (error) {
        console.error(`❌ Error creating free user record for ${user.email}:`, error)
      }
    }

    console.log(`🎉 Free users collection creation completed!`)
    console.log(`📈 Created: ${created} records`)
    console.log(`⏭️  Skipped: ${skipped} existing records`)
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
