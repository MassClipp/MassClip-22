import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { removeVercelDomain } from "@/lib/vercel-api"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    initializeFirebaseAdmin()

    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    await getAuth().verifyIdToken(token)

    const domainId = params.id
    console.log(`[v0] [Admin] Removing domain: ${domainId}`)

    // Get domain document
    const domainDoc = await db.collection("customDomains").doc(domainId).get()

    if (!domainDoc.exists) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const domainData = domainDoc.data()!

    // Remove from Vercel if verified
    if (domainData.verified) {
      try {
        await removeVercelDomain(domainData.domain)
        console.log(`[v0] [Admin] Removed domain from Vercel: ${domainData.domain}`)
      } catch (error) {
        console.error(`[v0] [Admin] Failed to remove from Vercel:`, error)
      }
    }

    // Mark as removed in database
    await db.collection("customDomains").doc(domainId).update({
      status: "removed",
      removedAt: new Date().toISOString(),
      removedBy: "admin",
    })

    console.log(`[v0] [Admin] Domain removed successfully: ${domainData.domain}`)

    return NextResponse.json({
      success: true,
      message: "Domain removed successfully",
    })
  } catch (error: any) {
    console.error("[Admin Remove Domain] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to remove domain" }, { status: 500 })
  }
}
