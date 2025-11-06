import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyIdToken } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userUid = decodedToken.uid

    console.log("[v0] Fetching freeUsers document for user:", userUid)

    // Fetch freeUsers document
    const freeUserDoc = await adminDb.collection("freeUsers").doc(userUid).get()

    const data = {
      exists: freeUserDoc.exists,
      data: freeUserDoc.exists ? freeUserDoc.data() : null,
    }

    console.log("[v0] freeUsers document data:", data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error fetching freeUsers document:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
