import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

const DEFAULT_TABS = [
  { id: "free_content", type: "free_content", name: "Free Content", enabled: true, order: 0 },
  { id: "premium_content", type: "premium_content", name: "Premium Content", enabled: true, order: 1 },
  { id: "ebooks", type: "ebooks", name: "eBooks", enabled: true, order: 2 },
]

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId

    const configDoc = await adminDb.collection("storefrontTabs").doc(userId).get()

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
    console.error("[StorefrontTabs] Error fetching public config:", error)
    return NextResponse.json(
      { error: "Failed to fetch storefront tabs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
