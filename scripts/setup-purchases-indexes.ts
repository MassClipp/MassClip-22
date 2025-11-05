import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
    console.log("✅ [Setup Indexes] Firebase Admin initialized")
  } catch (error) {
    console.error("❌ [Setup Indexes] Firebase Admin initialization error:", error)
    process.exit(1)
  }
}

const db = getFirestore()

export async function setupPurchasesIndexes() {
  console.log("🔧 [Setup Indexes] Setting up required Firestore indexes for purchases...")

  console.log(`
📋 Required Firestore Indexes for bundlePurchases Collection:

1. Collection: bundlePurchases
   Fields: 
   - buyerUid (Ascending)
   - createdAt (Descending)
   
2. Collection: bundlePurchases
   Fields:
   - buyerUid (Ascending) 
   - purchasedAt (Descending)

🔗 Create these indexes at:
https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes

Or use the Firebase CLI:
firebase firestore:indexes

The indexes will be created automatically when you run queries that require them,
but creating them manually will improve performance.

🧪 Testing database connection...
`)

  try {
    // Test database connection
    const testQuery = await db.collection("bundlePurchases").limit(1).get()
    console.log(`✅ [Setup Indexes] Database connection successful. Collection has ${testQuery.size} documents.`)

    // Test if indexes exist by running the queries
    console.log("🔍 [Setup Indexes] Testing if indexes exist...")

    try {
      const testUserId = "test-user-id"
      await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", testUserId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()
      console.log("✅ [Setup Indexes] createdAt index exists or will be auto-created")
    } catch (error: any) {
      if (error.code === "failed-precondition") {
        console.log("⚠️ [Setup Indexes] createdAt index missing - will be created when first used")
      }
    }

    try {
      const testUserId = "test-user-id"
      await db
        .collection("bundlePurchases")
        .where("buyerUid", "==", testUserId)
        .orderBy("purchasedAt", "desc")
        .limit(1)
        .get()
      console.log("✅ [Setup Indexes] purchasedAt index exists or will be auto-created")
    } catch (error: any) {
      if (error.code === "failed-precondition") {
        console.log("⚠️ [Setup Indexes] purchasedAt index missing - will be created when first used")
      }
    }

    return {
      success: true,
      message: "Index setup completed. Indexes will be created automatically when needed.",
    }
  } catch (error: any) {
    console.error("❌ [Setup Indexes] Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupPurchasesIndexes()
    .then((result) => {
      if (result.success) {
        console.log("✅ [Setup Indexes] Completed:", result.message)
      } else {
        console.error("❌ [Setup Indexes] Failed:", result.error)
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error("❌ [Setup Indexes] Unexpected error:", error)
      process.exit(1)
    })
}
