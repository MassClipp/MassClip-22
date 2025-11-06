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

    console.log(`[ProfileSync API] Syncing profiles for UID: ${uid}, Username: ${username}`)

    // Sync profiles
    const result = await syncUserAndCreatorProfiles(uid, username)

    if (!result.success) {
      console.error(`[ProfileSync API] Sync failed:`, result.error)
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    console.log(`[ProfileSync API] Sync completed successfully`)
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

// Add GET method to manually trigger sync
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get("uid")
    const username = searchParams.get("username")

    if (!uid || !username) {
      return NextResponse.json({ success: false, error: "Missing uid or username parameters" }, { status: 400 })
    }

    console.log(`[ProfileSync API GET] Syncing profiles for UID: ${uid}, Username: ${username}`)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Sync profiles
    const result = await syncUserAndCreatorProfiles(uid, username)

    if (!result.success) {
      console.error(`[ProfileSync API GET] Sync failed:`, result.error)
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    console.log(`[ProfileSync API GET] Sync completed successfully`)
    return NextResponse.json({ success: true, message: "Profiles synced successfully" })
  } catch (error) {
    console.error("Error in profile sync API GET:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
