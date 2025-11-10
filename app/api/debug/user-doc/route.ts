import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const userDoc = await adminDb.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    return NextResponse.json({
      userId,
      storefrontActive: userData?.storefrontActive ?? true,
      username: userData?.username,
      displayName: userData?.displayName,
      customDomain: userData?.customDomain,
      rawData: userData,
    })
  } catch (error) {
    console.error("[Debug] Error fetching user doc:", error)
    return NextResponse.json(
      { error: "Failed to fetch user doc", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    )
  }
}
