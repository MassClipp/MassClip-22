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

    const { domain, domainId } = await request.json()

    if (!domain && !domainId) {
      return NextResponse.json({ error: "Domain or domainId required" }, { status: 400 })
    }

    let docId = domainId

    // If we have a domain but no domainId, find it
    if (!docId && domain) {
      const querySnapshot = await adminDb
        .collection("customDomains")
        .where("domain", "==", domain)
        .where("userId", "==", userId)
        .limit(1)
        .get()

      if (!querySnapshot.empty) {
        docId = querySnapshot.docs[0].id
      }
    }

    if (!docId) {
      return NextResponse.json({ error: "Custom domain not found" }, { status: 404 })
    }

    // Update the domain status to active
    await adminDb.collection("customDomains").doc(docId).update({
      status: "active",
      lastChecked: new Date().toISOString(),
    })

    console.log("[v0] Fixed custom domain status:", docId)

    return NextResponse.json({
      success: true,
      message: "Custom domain status updated to active",
    })
  } catch (error: any) {
    console.error("[v0] Error fixing custom domain:", error)
    return NextResponse.json({ error: error.message || "Failed to fix custom domain" }, { status: 500 })
  }
}
