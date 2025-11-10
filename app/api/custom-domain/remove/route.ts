import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { removeDomainFromVercel } from "@/lib/vercel-api"

export async function POST(request: NextRequest) {
  try {
    initializeFirebaseAdmin()

    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[v0] [Remove Domain] No auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    console.log("[v0] [Remove Domain] User ID:", userId)

    let body: any = {}
    try {
      const rawBody = await request.text()
      if (rawBody) {
        body = JSON.parse(rawBody)
      }
    } catch (error) {
      console.log("[v0] [Remove Domain] No JSON body or parse error, will look up domain")
    }

    let domainId = body.domainId

    // If no domainId provided, find user's current domain
    if (!domainId) {
      console.log("[v0] [Remove Domain] No domainId provided, looking up user's domain")
      const domainsSnapshot = await db
        .collection("customDomains")
        .where("userId", "==", userId)
        .where("status", "!=", "removed")
        .limit(1)
        .get()

      if (domainsSnapshot.empty) {
        return NextResponse.json({ error: "No active domain found" }, { status: 404 })
      }

      domainId = domainsSnapshot.docs[0].id
      console.log("[v0] [Remove Domain] Found domain ID:", domainId)
    }

    // Get domain document
    const domainDoc = await db.collection("customDomains").doc(domainId).get()

    if (!domainDoc.exists) {
      console.log("[v0] [Remove Domain] Domain not found:", domainId)
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const domainData = domainDoc.data()

    if (domainData?.userId !== userId) {
      console.log("[v0] [Remove Domain] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    console.log("[v0] [Remove Domain] Removing domain:", domainData.domain)

    // Remove from Vercel if verified
    if (domainData.verified) {
      try {
        await removeDomainFromVercel(domainData.domain)
        console.log("[v0] [Remove Domain] Removed from Vercel successfully")
      } catch (error) {
        console.error("[v0] [Remove Domain] Vercel API error:", error)
        // Continue anyway to clean up local records
      }
    }

    // Mark as removed
    await db.collection("customDomains").doc(domainId).update({
      status: "removed",
      verified: false,
      removedAt: new Date().toISOString(),
    })

    // Clear user's custom domain
    await db.collection("users").doc(userId).update({
      customDomain: null,
      customDomainId: null,
    })

    console.log("[v0] [Remove Domain] Domain removed successfully:", domainData.domain)

    return NextResponse.json({
      success: true,
      message: "Custom domain removed successfully",
    })
  } catch (error: any) {
    console.error("[v0] [Remove Domain] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to remove custom domain" }, { status: 500 })
  }
}
