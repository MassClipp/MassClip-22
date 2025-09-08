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
    console.log("✅ [Folder Schema] Firebase Admin initialized")
  } catch (error) {
    console.error("❌ [Folder Schema] Firebase Admin initialization error:", error)
    process.exit(1)
  }
}

const db = getFirestore()

export async function setupFolderSchema() {
  console.log("🔧 [Folder Schema] Setting up folder organization database schema...")

  console.log(`
📋 Required Firestore Collections and Indexes for Folder System:

1. Collection: folders
   Fields:
   - id (Document ID)
   - name (string) - Folder name
   - userId (string) - Owner of the folder
   - parentId (string | null) - Parent folder ID (null for root folders)
   - path (string) - Full path like "/folder1/subfolder2"
   - createdAt (timestamp)
   - updatedAt (timestamp)
   - isDeleted (boolean) - Soft delete flag
   - color (string | null) - Optional folder color
   - description (string | null) - Optional folder description

2. Collection: uploads (Extended)
   New Fields:
   - folderId (string | null) - ID of containing folder
   - folderPath (string) - Full folder path for easy querying

Required Indexes:
1. folders: userId (Ascending) + createdAt (Descending)
2. folders: userId (Ascending) + parentId (Ascending) + createdAt (Descending)
3. folders: userId (Ascending) + isDeleted (Ascending) + createdAt (Descending)
4. uploads: uid (Ascending) + folderId (Ascending) + createdAt (Descending)
5. uploads: uid (Ascending) + folderPath (Ascending) + createdAt (Descending)

🔗 Create these indexes at:
https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes

🧪 Testing database connection and creating sample folder structure...
`)

  try {
    // Test database connection
    const testQuery = await db.collection("folders").limit(1).get()
    console.log(
      `✅ [Folder Schema] Database connection successful. Folders collection has ${testQuery.size} documents.`,
    )

    // Create sample folder structure for testing
    console.log("📁 [Folder Schema] Creating sample folder structure...")

    const sampleUserId = "sample-user-for-testing"
    const timestamp = new Date()

    // Create root folder
    const rootFolderRef = await db.collection("folders").add({
      name: "My Videos",
      userId: sampleUserId,
      parentId: null,
      path: "/My Videos",
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      color: "#3B82F6",
      description: "Main video folder",
    })

    // Create subfolder
    const subFolderRef = await db.collection("folders").add({
      name: "B-Roll",
      userId: sampleUserId,
      parentId: rootFolderRef.id,
      path: "/My Videos/B-Roll",
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      color: "#10B981",
      description: "Background video content",
    })

    console.log(`✅ [Folder Schema] Created sample folders:`)
    console.log(`   - Root folder: ${rootFolderRef.id} (/My Videos)`)
    console.log(`   - Sub folder: ${subFolderRef.id} (/My Videos/B-Roll)`)

    // Test folder queries
    console.log("🔍 [Folder Schema] Testing folder queries...")

    try {
      // Test root folders query
      const rootFolders = await db
        .collection("folders")
        .where("userId", "==", sampleUserId)
        .where("parentId", "==", null)
        .where("isDeleted", "==", false)
        .orderBy("createdAt", "desc")
        .get()
      console.log(`✅ [Folder Schema] Root folders query successful (${rootFolders.size} folders)`)
    } catch (error: any) {
      if (error.code === "failed-precondition") {
        console.log("⚠️ [Folder Schema] Root folders index missing - will be created when first used")
      }
    }

    try {
      // Test subfolders query
      const subFolders = await db
        .collection("folders")
        .where("userId", "==", sampleUserId)
        .where("parentId", "==", rootFolderRef.id)
        .where("isDeleted", "==", false)
        .orderBy("createdAt", "desc")
        .get()
      console.log(`✅ [Folder Schema] Subfolders query successful (${subFolders.size} folders)`)
    } catch (error: any) {
      if (error.code === "failed-precondition") {
        console.log("⚠️ [Folder Schema] Subfolders index missing - will be created when first used")
      }
    }

    return {
      success: true,
      message: "Folder schema setup completed successfully",
      sampleFolders: {
        rootId: rootFolderRef.id,
        subId: subFolderRef.id,
      },
    }
  } catch (error: any) {
    console.error("❌ [Folder Schema] Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupFolderSchema()
    .then((result) => {
      if (result.success) {
        console.log("✅ [Folder Schema] Completed:", result.message)
        if (result.sampleFolders) {
          console.log("📁 Sample folders created:", result.sampleFolders)
        }
      } else {
        console.error("❌ [Folder Schema] Failed:", result.error)
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error("❌ [Folder Schema] Unexpected error:", error)
      process.exit(1)
    })
}
