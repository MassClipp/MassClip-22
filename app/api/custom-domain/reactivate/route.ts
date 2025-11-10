import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json()

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 })
    }

    console.log(`[v0] [Reactivate] Reactivating domain: ${domain}`)

    // Find the domain document
    const snapshot = await db.collection("customDomains").where("domain", "==", domain).limit(1).get()

    if (snapshot.empty) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 })
    }

    const doc = snapshot.docs[0]
    const domainData = doc.data()

    console.log(`[v0] [Reactivate] Found domain with status: ${domainData.status}`)

    // Update status to active
    await db.collection("customDomains").doc(doc.id).update({
      status: "active",
      updatedAt: new Date().toISOString(),
    })

    console.log(`[v0] [Reactivate] Successfully reactivated domain: ${domain}`)

    return NextResponse.json({
      success: true,
      message: "Domain reactivated successfully",
      domain,
      previousStatus: domainData.status,
      newStatus: "active",
    })
  } catch (error) {
    console.error("[v0] [Reactivate] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to reactivate domain",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
