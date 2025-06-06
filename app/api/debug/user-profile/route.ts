import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔍 [User Profile Debug] Checking user profile for:", session.uid)

    const results = {
      userId: session.uid,
      userProfiles: null,
      users: null,
      recommendations: [],
    }

    // Check userProfiles collection
    try {
      const userProfileDoc = await db.collection("userProfiles").doc(session.uid).get()
      if (userProfileDoc.exists) {
        const data = userProfileDoc.data()
        results.userProfiles = {
          exists: true,
          username: data?.username,
          displayName: data?.displayName,
          email: data?.email,
          createdAt: data?.createdAt,
          fields: Object.keys(data || {}),
        }
      } else {
        results.userProfiles = { exists: false }
        results.recommendations.push("Create user profile in userProfiles collection")
      }
    } catch (error) {
      results.userProfiles = { error: error instanceof Error ? error.message : "Unknown error" }
    }

    // Check users collection
    try {
      const userDoc = await db.collection("users").doc(session.uid).get()
      if (userDoc.exists) {
        const data = userDoc.data()
        results.users = {
          exists: true,
          username: data?.username,
          displayName: data?.displayName,
          email: data?.email,
          createdAt: data?.createdAt,
          fields: Object.keys(data || {}),
        }
      } else {
        results.users = { exists: false }
        results.recommendations.push("Create user document in users collection")
      }
    } catch (error) {
      results.users = { error: error instanceof Error ? error.message : "Unknown error" }
    }

    // Add recommendations
    if (!results.userProfiles?.username && !results.users?.username) {
      results.recommendations.push("No username found in either collection - consider setting a default")
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("❌ [User Profile Debug] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to debug user profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
