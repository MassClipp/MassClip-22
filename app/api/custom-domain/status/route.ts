import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    initializeFirebaseAdmin()

    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get user's custom domain
    const domainQuery = await db
      .collection("customDomains")
      .where("userId", "==", userId)
      .where("status", "!=", "removed")
      .limit(1)
      .get()

    if (domainQuery.empty) {
      return NextResponse.json({ domain: null })
    }

    const domainDoc = domainQuery.docs[0]
    const domainData = domainDoc.data()

    return NextResponse.json({
      domain: {
        id: domainDoc.id,
        domainId: domainDoc.id, // Include both for compatibility
        ...domainData,
      },
    })
  } catch (error: any) {
    console.error("[Custom Domain Status] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to get custom domain status" }, { status: 500 })
  }
}
