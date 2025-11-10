import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] === Custom Domain Status API Called ===")
    initializeFirebaseAdmin()

    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[v0] Status: Missing auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid
    console.log("[v0] Status: User authenticated:", userId)

    // Get user's custom domain
    const domainQuery = await db.collection("customDomains").where("userId", "==", userId).get()

    console.log("[v0] Status: Found domains:", domainQuery.size)

    // Filter out removed domains in memory
    const activeDomains = domainQuery.docs.filter((doc) => {
      const data = doc.data()
      return data.status !== "removed"
    })

    console.log("[v0] Status: Active domains after filtering:", activeDomains.length)

    if (activeDomains.length === 0) {
      console.log("[v0] Status: No active domain found")
      return NextResponse.json({ domain: null })
    }

    const domainDoc = activeDomains[0]
    const domainData = domainDoc.data()

    console.log("[v0] Status: Returning domain:", domainDoc.id)

    return NextResponse.json({
      domain: {
        id: domainDoc.id,
        domainId: domainDoc.id,
        ...domainData,
        // Ensure SSL status fields are included
        sslStatus: domainData.sslStatus || "pending",
        sslError: domainData.sslError || null,
      },
    })
  } catch (error: any) {
    console.error("[v0] Custom Domain Status Error:", error)
    return NextResponse.json({ error: error.message || "Failed to get custom domain status" }, { status: 500 })
  }
}
