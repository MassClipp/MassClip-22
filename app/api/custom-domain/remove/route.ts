import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { removeDomainFromVercel } from "@/lib/vercel-api"
import { requireCustomDomainPermissions } from "@/lib/custom-domain-permissions"

export async function POST(request: NextRequest) {
  try {
    initializeFirebaseAdmin()

    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    try {
      await requireCustomDomainPermissions(userId)
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    const { domainId } = await request.json()

    if (!domainId) {
      return NextResponse.json({ error: "Domain ID is required" }, { status: 400 })
    }

    // Get domain document
    const domainDoc = await db.collection("customDomains").doc(domainId).get()

    if (!domainDoc.exists) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const domainData = domainDoc.data()

    if (domainData?.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Remove from Vercel if verified
    if (domainData.verified) {
      try {
        await removeDomainFromVercel(domainData.domain)
      } catch (error) {
        console.error("[Custom Domain Remove] Vercel API error:", error)
        // Continue anyway to clean up local records
      }
    }

    // Mark as removed
    await db.collection("customDomains").doc(domainId).update({
      status: "removed",
      verified: false,
    })

    // Clear user's custom domain
    await db.collection("users").doc(userId).update({
      customDomain: null,
      customDomainId: null,
    })

    return NextResponse.json({
      success: true,
      message: "Custom domain removed successfully",
    })
  } catch (error: any) {
    console.error("[Custom Domain Remove] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to remove custom domain" }, { status: 500 })
  }
}
