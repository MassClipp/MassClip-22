import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { syncUserAndCreatorProfiles } from "@/lib/profile-sync"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Get request body
    const body = await request.json()
    const { uid, username } = body

    if (!uid || !username) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Sync profiles
    const result = await syncUserAndCreatorProfiles(uid, username)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in profile sync API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
