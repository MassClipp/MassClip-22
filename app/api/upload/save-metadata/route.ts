import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  console.log("Save metadata request received")

  try {
    // Verify authentication
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      console.log("No session cookie found")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    let decodedToken
    try {
      decodedToken = await auth.verifySessionCookie(sessionCookie)
    } catch (error) {
      console.error("Session verification failed:", error)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const uid = decodedToken.uid

    console.log(`Authenticated user: ${uid}`)

    // Parse request body
    const { title, description, isPremium = false, fileId, key, publicUrl, fileType } = await request.json()

    if (!fileId || !key || !publicUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Save metadata to Firestore
    const db = getFirestore()
    const collectionName = isPremium ? "premiumClips" : "freeClips"

    const metadata = {
      title: title || "Untitled",
      description: description || "",
      fileId,
      key,
      publicUrl,
      fileType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: uid,
      views: 0,
      isPremium,
    }

    console.log(`Saving metadata to ${collectionName}/${fileId}:`, metadata)

    await db.collection("users").doc(uid).collection(collectionName).doc(fileId).set(metadata)

    console.log("Metadata saved successfully")

    return NextResponse.json({
      success: true,
      message: "Metadata saved successfully",
      fileId,
    })
  } catch (error) {
    console.error("Error saving metadata:", error)
    return NextResponse.json(
      { error: `Failed to save metadata: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}

export const maxDuration = 60 // Set max duration to 60 seconds
