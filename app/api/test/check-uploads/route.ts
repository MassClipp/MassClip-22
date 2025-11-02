import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Check Uploads] Checking uploads collection...")

    // Check total uploads
    const uploadsRef = db.collection("uploads")
    const snapshot = await uploadsRef.get()

    console.log(`📊 [Check Uploads] Total uploads: ${snapshot.docs.length}`)

    // Check free content uploads
    const freeContentRef = db.collection("uploads").where("isFreeContent", "==", true)
    const freeSnapshot = await freeContentRef.get()

    console.log(`🆓 [Check Uploads] Free content uploads: ${freeSnapshot.docs.length}`)

    // Get sample data
    const sampleUploads = snapshot.docs.slice(0, 5).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const sampleFreeContent = freeSnapshot.docs.slice(0, 5).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      totalUploads: snapshot.docs.length,
      freeContentUploads: freeSnapshot.docs.length,
      sampleUploads,
      sampleFreeContent,
      message:
        snapshot.docs.length === 0
          ? "No uploads found in database. You need to upload some content first."
          : freeSnapshot.docs.length === 0
            ? "Uploads exist but none are marked as free content."
            : "Free content uploads found!",
    })
  } catch (error) {
    console.error("❌ [Check Uploads] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check uploads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
