import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const accessToken = request.cookies.get("purchase_access_token")?.value

    if (!accessToken) {
      return NextResponse.json({ purchases: [] })
    }

    // Query anonymous purchases using the access token
    const anonymousPurchasesRef = db.collection("anonymousPurchases")
    const snapshot = await anonymousPurchasesRef.where("accessToken", "==", accessToken).get()

    if (snapshot.empty) {
      return NextResponse.json({ purchases: [] })
    }

    const purchases = []
    for (const doc of snapshot.docs) {
      const purchaseData = doc.data()

      // Get product box details
      const productBoxRef = db.collection("productBoxes").doc(purchaseData.productBoxId)
      const productBoxDoc = await productBoxRef.get()

      if (!productBoxDoc.exists) {
        continue
      }

      const productBoxData = productBoxDoc.data()

      // Get creator details
      const creatorRef = db.collection("users").doc(productBoxData.creatorId)
      const creatorDoc = await creatorRef.get()
      const creatorData = creatorDoc.exists ? creatorDoc.data() : {}

      // Get content items
      const contentRef = db.collection("productBoxContent")
      const contentSnapshot = await contentRef.where("productBoxId", "==", purchaseData.productBoxId).get()

      const items = contentSnapshot.docs.map((contentDoc) => {
        const content = contentDoc.data()
        return {
          id: contentDoc.id,
          title: content.title || content.fileName || "Untitled",
          fileUrl: content.fileUrl || content.downloadUrl,
          thumbnailUrl: content.thumbnailUrl,
          fileSize: content.fileSize || 0,
          duration: content.duration || 0,
          contentType: content.contentType || "document",
        }
      })

      purchases.push({
        id: doc.id,
        productBoxId: purchaseData.productBoxId,
        productBoxTitle: productBoxData.title,
        productBoxDescription: productBoxData.description,
        productBoxThumbnail: productBoxData.thumbnailUrl,
        creatorId: productBoxData.creatorId,
        creatorName: creatorData.displayName || creatorData.name || "Unknown Creator",
        creatorUsername: creatorData.username || "unknown",
        amount: purchaseData.amount || 0,
        currency: purchaseData.currency || "usd",
        items,
        totalItems: items.length,
        totalSize: items.reduce((sum, item) => sum + (item.fileSize || 0), 0),
        purchasedAt: purchaseData.purchasedAt || new Date().toISOString(),
        status: "completed",
        anonymousAccess: true,
      })
    }

    return NextResponse.json({ purchases })
  } catch (error) {
    console.error("Error fetching anonymous purchases:", error)
    return NextResponse.json({ purchases: [] })
  }
}
