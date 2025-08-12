import { type NextRequest, NextResponse } from "next/server"
import { incrementDownload } from "@/lib/free-users-service"
import { incrementDownloads } from "@/lib/memberships-service"
import { getUserTierInfo } from "@/lib/user-tier-service"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid

    // Check user tier to determine which service to use
    const tierInfo = await getUserTierInfo(uid)

    if (tierInfo.tier === "creator_pro") {
      // Pro users - increment in memberships (no limits)
      await incrementDownloads(uid)
      return NextResponse.json({ success: true, unlimited: true })
    } else {
      // Free users - check limits and increment
      const canIncrement = await incrementDownload(uid)
      if (!canIncrement) {
        return NextResponse.json(
          {
            error: "Download limit reached",
            reachedLimit: true,
          },
          { status: 403 },
        )
      }
      return NextResponse.json({ success: true, unlimited: false })
    }
  } catch (error) {
    console.error("Error incrementing download:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
