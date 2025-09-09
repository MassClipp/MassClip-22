import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Test Folders API] Testing folder system...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    try {
      // Verify the Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid

      // Test database connection
      const testDoc = await db.collection("test").doc("connection").set({
        timestamp: new Date(),
        userId,
      })

      // Create a test folder
      const testFolder = await db.collection("folders").add({
        name: "Test Folder",
        userId,
        parentId: null,
        path: "/Test Folder",
        color: null,
        description: "Test folder created by API",
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Query the folder back
      const folderDoc = await db.collection("folders").doc(testFolder.id).get()
      const folderData = folderDoc.data()

      return NextResponse.json({
        success: true,
        message: "Folder system test successful",
        userId,
        testFolderId: testFolder.id,
        folderData,
        timestamp: new Date().toISOString(),
      })
    } catch (authError) {
      console.error("❌ [Test Folders API] Auth error:", authError)
      return NextResponse.json(
        {
          error: "Invalid authentication token",
          details: authError instanceof Error ? authError.message : "Unknown auth error",
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("❌ [Test Folders API] Error:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
