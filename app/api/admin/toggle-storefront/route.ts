import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAuth } from "@/lib/auth-helpers"

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const userId = await verifyAuth(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { active } = await request.json()

    if (typeof active !== "boolean") {
      return NextResponse.json({ error: "Active status must be a boolean" }, { status: 400 })
    }

    // Update the user's storefrontActive status
    await adminDb.collection("users").doc(userId).update({
      storefrontActive: active,
      updatedAt: new Date().toISOString(),
    })

    console.log("[v0] Toggled storefront status:", userId, active)

    return NextResponse.json({
      success: true,
      storefrontActive: active,
      message: `Storefront ${active ? "activated" : "deactivated"}`,
    })
  } catch (error: any) {
    console.error("[v0] Error toggling storefront:", error)
    return NextResponse.json({ error: error.message || "Failed to toggle storefront" }, { status: 500 })
  }
}
