import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return null
    }

    const token = authorization.split("Bearer ")[1]
    if (!token) {
      return null
    }

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get("uploadId")

    if (!uploadId) {
      return NextResponse.json({ error: "Missing uploadId" }, { status: 400 })
    }

    // Get upload document
    const uploadDoc = await db.collection("uploads").doc(uploadId).get()

    if (!uploadDoc.exists) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    const uploadData = uploadDoc.data()!

    if (uploadData.uid !== user.uid) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Check transcription status
    const transcriptStatus = uploadData.transcriptStatus || "pending"
    const transcriptError = uploadData.transcriptError || null

    // Check image description status
    const imageDescriptionStatus = uploadData.imageDescriptionStatus || "pending"
    const imageDescriptionError = uploadData.imageDescriptionError || null

    return NextResponse.json({
      success: true,
      uploadId,
      transcriptStatus,
      transcriptError,
      hasTranscript: !!uploadData.transcript,
      imageDescriptionStatus,
      imageDescriptionError,
      hasImageDescription: !!uploadData.imageDescription,
      processingComplete:
        (transcriptStatus === "completed" || transcriptStatus === "failed" || transcriptStatus === "skipped") &&
        (imageDescriptionStatus === "completed" ||
          imageDescriptionStatus === "failed" ||
          imageDescriptionStatus === "skipped"),
    })
  } catch (error) {
    console.error("Error fetching processing status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
