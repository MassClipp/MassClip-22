import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  console.log("🔍 Username availability check started")

  try {
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const { username } = body

    if (!username) {
      console.log("❌ No username provided")
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Clean and validate username
    const cleanUsername = username.toLowerCase().trim()
    console.log(`🔍 Checking username: "${cleanUsername}"`)

    // Basic validation
    if (cleanUsername.length < 3) {
      return NextResponse.json({ available: false, reason: "Username must be at least 3 characters" })
    }

    if (cleanUsername.length > 20) {
      return NextResponse.json({ available: false, reason: "Username must be 20 characters or less" })
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json({
        available: false,
        reason: "Username can only contain letters, numbers, and underscores",
      })
    }

    // Get Firebase Admin database
    let db
    try {
      db = getAdminDb()
      console.log("✅ Firebase Admin database connected")
    } catch (firebaseError) {
      console.error("❌ Firebase Admin initialization failed:", firebaseError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: firebaseError.message,
        },
        { status: 503 },
      )
    }

    // Check username availability using Admin SDK
    try {
      console.log(`🔍 Querying users collection for username: ${cleanUsername}`)

      // Query users collection
      const usersQuery = db.collection("users").where("username", "==", cleanUsername)
      const usersSnapshot = await usersQuery.get()

      if (!usersSnapshot.empty) {
        console.log(`❌ Username "${cleanUsername}" found in users collection`)
        return NextResponse.json({
          available: false,
          reason: "Username is already taken",
        })
      }

      console.log(`✅ Username "${cleanUsername}" not found in users collection`)

      // Check usernames collection
      console.log(`🔍 Checking usernames collection for: ${cleanUsername}`)
      const usernameDoc = await db.collection("usernames").doc(cleanUsername).get()

      if (usernameDoc.exists) {
        console.log(`❌ Username "${cleanUsername}" found in usernames collection`)
        return NextResponse.json({
          available: false,
          reason: "Username is already taken",
        })
      }

      console.log(`✅ Username "${cleanUsername}" not found in usernames collection`)

      // Check creators collection
      console.log(`🔍 Checking creators collection for: ${cleanUsername}`)
      const creatorDoc = await db.collection("creators").doc(cleanUsername).get()

      if (creatorDoc.exists) {
        console.log(`❌ Username "${cleanUsername}" found in creators collection`)
        return NextResponse.json({
          available: false,
          reason: "Username is already taken",
        })
      }

      console.log(`✅ Username "${cleanUsername}" not found in creators collection`)

      // Username is available
      console.log(`✅ Username "${cleanUsername}" is available`)
      return NextResponse.json({
        available: true,
        reason: "Username is available",
      })
    } catch (queryError) {
      console.error("❌ Firestore query error:", queryError)
      console.error("Query error details:", {
        name: queryError.name,
        message: queryError.message,
        code: queryError.code,
      })

      return NextResponse.json(
        {
          error: "Database query failed",
          details: queryError.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ Unexpected error in username check:", error)
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
