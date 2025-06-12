import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const productBoxId = params.id
    console.log(`🔍 [Check Product Box] Checking if product box exists: ${productBoxId}`)

    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Check Product Box] Product box not found: ${productBoxId}`)
      return NextResponse.json({
        exists: false,
        message: "Product box not found",
        productBoxId,
      })
    }

    console.log(`✅ [Check Product Box] Product box exists: ${productBoxId}`)
    return NextResponse.json({
      exists: true,
      message: "Product box exists",
      productBoxId,
      data: productBoxDoc.data(),
    })
  } catch (error) {
    console.error("[Check Product Box] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to check product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
