import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

async function getParams(request: NextRequest): Promise<{ username: string | null }> {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")
  return { username }
}

export async function GET(request: NextRequest) {
  try {
    const { username } = await getParams(request)

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    console.log(`📊 [Profile View Stats] Fetching stats for user: ${username}`)

    const snapshot = await db.collection("profileViews").doc(username).get()

    const data = snapshot.exists ? snapshot.data() : { views: 0 }

    return NextResponse.json({
      success: true,
      views: data.views || 0,
    })
  } catch (error) {
    console.error("❌ [Profile View Stats] Error:", error)
    return NextResponse.json({ error: "Failed to fetch profile view stats" }, { status: 500 })
  }
}
