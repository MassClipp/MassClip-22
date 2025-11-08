import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { v4 as uuidv4 } from "uuid"

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
    const { tabId, title, description, thumbnailUrl, externalUrl, ctaText, price, featured } = body

    if (!tabId || !title || !externalUrl || !ctaText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const configDoc = await adminDb.collection("storefrontTabs").doc(uid).get()
    const data = configDoc.data()
    const existingProducts = data?.externalProducts || []

    const newProduct = {
      id: uuidv4(),
      tabId,
      title,
      description: description || "",
      thumbnailUrl: thumbnailUrl || "",
      externalUrl,
      ctaText,
      price: price || "",
      featured: featured || false,
      order: existingProducts.length,
      createdAt: new Date().toISOString(),
    }

    await adminDb
      .collection("storefrontTabs")
      .doc(uid)
      .set(
        {
          externalProducts: [...existingProducts, newProduct],
          lastUpdated: new Date(),
        },
        { merge: true },
      )

    return NextResponse.json({ product: newProduct })
  } catch (error) {
    console.error("[StorefrontTabs] Error creating product:", error)
    return NextResponse.json(
      { error: "Failed to create product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
