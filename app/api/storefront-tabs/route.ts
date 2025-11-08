import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

const DEFAULT_TABS = [
  { id: "free_content", type: "free_content" as const, name: "Free Content", enabled: true, order: 0 },
  { id: "premium_content", type: "premium_content" as const, name: "Premium Content", enabled: true, order: 1 },
  { id: "ebooks", type: "ebooks" as const, name: "eBooks", enabled: true, order: 2 },
  { id: "community", type: "community" as const, name: "Community", enabled: false, order: 3 },
  { id: "merch", type: "merch" as const, name: "Merch", enabled: false, order: 4 },
  { id: "affiliates", type: "affiliates" as const, name: "Affiliates", enabled: false, order: 5 },
]

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const configDoc = await adminDb.collection("storefrontTabs").doc(uid).get()

    if (!configDoc.exists) {
      return NextResponse.json({
        tabs: DEFAULT_TABS,
        externalProducts: [],
      })
    }

    const data = configDoc.data()
    return NextResponse.json({
      tabs: data?.tabs || DEFAULT_TABS,
      externalProducts: data?.externalProducts || [],
    })
  } catch (error) {
    console.error("[StorefrontTabs] Error fetching config:", error)
    return NextResponse.json(
      { error: "Failed to fetch storefront tabs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = await request.json()
    const { tabs, externalProducts } = body

    await adminDb
      .collection("storefrontTabs")
      .doc(uid)
      .set(
        {
          userId: uid,
          tabs: tabs || DEFAULT_TABS,
          externalProducts: externalProducts || [],
          lastUpdated: new Date(),
        },
        { merge: true },
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[StorefrontTabs] Error updating config:", error)
    return NextResponse.json(
      { error: "Failed to update storefront tabs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
