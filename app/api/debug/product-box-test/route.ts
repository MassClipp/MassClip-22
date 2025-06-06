import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const productBoxId = url.searchParams.get("id")

    if (!productBoxId) {
      return NextResponse.json({
        success: false,
        message: "Missing product box ID",
        usage: "Add ?id=PRODUCT_BOX_ID to test a specific product box",
      })
    }

    console.log("🔍 [Product Box Test] Testing access to product box:", productBoxId)

    // Test 1: Basic collection existence
    const collectionRef = db.collection("productBoxes")
    console.log("✅ [Product Box Test] Collection reference created")

    // Test 2: Document access
    console.log("🔍 [Product Box Test] Attempting to get document...")
    const docRef = collectionRef.doc(productBoxId)
    const docSnapshot = await docRef.get()

    if (!docSnapshot.exists) {
      return NextResponse.json({
        success: false,
        message: "Product box not found",
        productBoxId,
        exists: false,
      })
    }

    // Test 3: Document data access
    const data = docSnapshot.data()

    return NextResponse.json({
      success: true,
      message: "Product box access successful",
      productBoxId,
      exists: true,
      data: {
        title: data?.title,
        price: data?.price,
        active: data?.active,
        priceId: data?.priceId,
        creatorId: data?.creatorId,
        hasRequiredFields: !!(
          data?.active &&
          data?.title &&
          typeof data?.price === "number" &&
          data?.priceId &&
          data?.creatorId
        ),
      },
    })
  } catch (error) {
    console.error("❌ [Product Box Test] Error:", error)

    // Enhanced error details
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack?.split("\n").slice(0, 3).join("\n"),
          }
        : "Unknown error type"

    return NextResponse.json(
      {
        success: false,
        message: "Error accessing product box",
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.name : "Unknown",
        errorDetails,
      },
      { status: 500 },
    )
  }
}
