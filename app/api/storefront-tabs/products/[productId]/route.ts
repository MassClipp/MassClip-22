import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function PUT(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = await request.json()
    const productId = params.productId

    const configDoc = await adminDb.collection("storefrontTabs").doc(uid).get()
    const data = configDoc.data()
    const existingProducts = data?.externalProducts || []

    const updatedProducts = existingProducts.map((product: any) =>
      product.id === productId ? { ...product, ...body, id: productId } : product,
    )

    await adminDb.collection("storefrontTabs").doc(uid).set(
      {
        externalProducts: updatedProducts,
        lastUpdated: new Date(),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[StorefrontTabs] Error updating product:", error)
    return NextResponse.json(
      { error: "Failed to update product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const productId = params.productId

    const configDoc = await adminDb.collection("storefrontTabs").doc(uid).get()
    const data = configDoc.data()
    const existingProducts = data?.externalProducts || []

    const updatedProducts = existingProducts.filter((product: any) => product.id !== productId)

    await adminDb.collection("storefrontTabs").doc(uid).set(
      {
        externalProducts: updatedProducts,
        lastUpdated: new Date(),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[StorefrontTabs] Error deleting product:", error)
    return NextResponse.json(
      { error: "Failed to delete product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
