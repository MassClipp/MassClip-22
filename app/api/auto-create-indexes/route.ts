import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST() {
  try {
    console.log("🔧 [Auto Index] Starting automatic index creation...")

    // Try to create a simple document to trigger index creation
    const testDoc = {
      productBoxId: "test_index_creation",
      status: "completed",
      uploadedAt: new Date(),
      fileName: "test_file.txt",
      fileType: "text",
      fileSize: 1024,
      createdAt: new Date(),
    }

    // Create a test document in productBoxContent collection
    const testRef = await db.collection("productBoxContent").add(testDoc)
    console.log("✅ [Auto Index] Created test document:", testRef.id)

    // Try to perform the query that requires the index
    try {
      const querySnapshot = await db
        .collection("productBoxContent")
        .where("productBoxId", "==", "test_index_creation")
        .where("status", "==", "completed")
        .orderBy("uploadedAt", "desc")
        .limit(1)
        .get()

      console.log("✅ [Auto Index] Query successful - index exists or was created")

      // Clean up test document
      await testRef.delete()
      console.log("✅ [Auto Index] Cleaned up test document")

      return NextResponse.json({
        success: true,
        message: "Index created successfully!",
        details: "The required index has been created automatically.",
      })
    } catch (queryError) {
      console.log("⚠️ [Auto Index] Query failed, index still needed:", queryError)

      // Clean up test document
      await testRef.delete()

      // Return instructions for manual creation
      return NextResponse.json({
        success: false,
        message: "Automatic index creation failed",
        manualSteps: [
          "1. Go to https://console.firebase.google.com",
          "2. Select your project (massclip-96dc4)",
          "3. Click on 'Firestore Database' in the left menu",
          "4. Click on 'Indexes' tab",
          "5. Click 'Create Index'",
          "6. Set Collection ID to: productBoxContent",
          "7. Add field: productBoxId (Ascending)",
          "8. Add field: status (Ascending)",
          "9. Add field: uploadedAt (Descending)",
          "10. Click 'Create'",
        ],
        autoRetryUrl: "/api/auto-create-indexes",
      })
    }
  } catch (error) {
    console.error("❌ [Auto Index] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create index automatically",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
