import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Product Box Content] Fetching content for product box: ${params.id}`)

    // Get Firebase auth token from Authorization header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Product Box Content] No auth token provided")
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
      console.log(`✅ [Product Box Content] Token verified for user: ${decodedToken.uid}`)
    } catch (error) {
      console.log("❌ [Product Box Content] Invalid token:", error)
      return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Verify product box exists
    const productBoxRef = db.collection("productBoxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Product Box Content] Product box not found: ${params.id}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()

    // Check if user owns this product box OR has purchased it
    const isOwner = productBoxData?.creatorId === userId
    let hasPurchased = false

    if (!isOwner) {
      try {
        // Check user subcollection purchases
        const userPurchasesSnapshot = await db.collection("users").doc(userId).collection("purchases").get()

        for (const doc of userPurchasesSnapshot.docs) {
          const purchase = doc.data()
          if (
            (purchase.itemId === params.id || purchase.productBoxId === params.id) &&
            purchase.status === "completed"
          ) {
            hasPurchased = true
            break
          }
        }

        // Check main purchases collection
        if (!hasPurchased) {
          const mainPurchasesSnapshot = await db.collection("purchases").where("userId", "==", userId).get()

          for (const doc of mainPurchasesSnapshot.docs) {
            const purchase = doc.data()
            if (
              (purchase.itemId === params.id || purchase.productBoxId === params.id) &&
              purchase.status === "completed"
            ) {
              hasPurchased = true
              break
            }
          }
        }
      } catch (purchaseError) {
        console.error(`❌ [Product Box Content] Error during purchase verification:`, purchaseError)
      }
    }

    if (!isOwner && !hasPurchased) {
      console.log(`❌ [Product Box Content] Access denied for user ${userId} to product box ${params.id}`)
      return NextResponse.json({ error: "Access denied - purchase required" }, { status: 403 })
    }

    // Fetch content with strict fileUrl validation
    let content = []

    try {
      // 1. Try productBoxContent collection with productBoxId field (CONFIRMED BY DIAGNOSTIC)
      const productBoxContentSnapshot = await db
        .collection("productBoxContent")
        .where("productBoxId", "==", params.id)
        .get()

      if (!productBoxContentSnapshot.empty) {
        content = productBoxContentSnapshot.docs
          .map((doc) => {
            const data = doc.data()
            console.log(`📄 [Content Item] Found item with ID ${doc.id}:`, data)

            return {
              id: doc.id,
              title: data.title || data.originalFileName || data.fileName || "Untitled",
              originalFileName: data.originalFileName || data.fileName || "Unknown",
              fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl, // Use all possible URL fields
              thumbnailUrl: data.thumbnailUrl,
              fileType: data.fileType || data.mimeType || "application/octet-stream",
              fileSize: data.fileSize || data.size || 0,
              category: data.category || data.contentType || "document",
              duration: data.duration,
              uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            }
          })
          .filter((item) => item.fileUrl && item.fileUrl.startsWith("http")) // Strict validation

        console.log(`✅ [Content Source 1] Found ${content.length} valid items with productBoxId field`)
      } else {
        console.log(`⚠️ [Content Source 1] No items found with productBoxId=${params.id}`)
      }

      // 2. If no content, try productBoxContent collection with boxId field
      if (content.length === 0) {
        const boxIdSnapshot = await db.collection("productBoxContent").where("boxId", "==", params.id).get()

        if (!boxIdSnapshot.empty) {
          content = boxIdSnapshot.docs
            .map((doc) => {
              const data = doc.data()
              console.log(`📄 [Content Item] Found item with ID ${doc.id} using boxId:`, data)

              return {
                id: doc.id,
                title: data.title || data.originalFileName || data.fileName || "Untitled",
                originalFileName: data.originalFileName || data.fileName || "Unknown",
                fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl,
                thumbnailUrl: data.thumbnailUrl,
                fileType: data.fileType || data.mimeType || "application/octet-stream",
                fileSize: data.fileSize || data.size || 0,
                category: data.category || data.contentType || "document",
                duration: data.duration,
                uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              }
            })
            .filter((item) => item.fileUrl && item.fileUrl.startsWith("http"))

          console.log(`✅ [Content Source 2] Found ${content.length} valid items with boxId field`)
        } else {
          console.log(`⚠️ [Content Source 2] No items found with boxId=${params.id}`)
        }
      }

      // 3. If still no content, try contents subcollection
      if (content.length === 0) {
        try {
          const contentsSnapshot = await productBoxRef.collection("contents").get()

          if (!contentsSnapshot.empty) {
            content = contentsSnapshot.docs
              .map((doc) => {
                const data = doc.data()
                console.log(`📄 [Content Item] Found item in contents subcollection with ID ${doc.id}:`, data)

                return {
                  id: doc.id,
                  title: data.title || data.originalFileName || "Untitled",
                  originalFileName: data.originalFileName || data.title || "Unknown",
                  fileUrl: data.fileUrl || data.publicUrl || data.downloadUrl,
                  thumbnailUrl: data.thumbnailUrl,
                  fileType: data.mimeType || data.fileType || "application/octet-stream",
                  fileSize: data.size || data.fileSize || 0,
                  category: data.category || "document",
                  duration: data.duration,
                  uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                }
              })
              .filter((item) => item.fileUrl && item.fileUrl.startsWith("http"))

            console.log(`✅ [Content Source 3] Found ${content.length} valid items in contents subcollection`)
          } else {
            console.log(`⚠️ [Content Source 3] No items found in contents subcollection`)
          }
        } catch (error) {
          console.error(`❌ [Content Source 3] Error accessing contents subcollection:`, error)
        }
      }

      // 4. If still no content, try contentItems array
      if (content.length === 0 && productBoxData?.contentItems?.length > 0) {
        const contentItems = productBoxData.contentItems || []
        console.log(`🔍 [Content Source 4] Checking contentItems array with ${contentItems.length} items`)

        const uploadPromises = contentItems.map(async (uploadId) => {
          try {
            const uploadDoc = await db.collection("uploads").doc(uploadId).get()
            if (uploadDoc.exists) {
              const uploadData = uploadDoc.data()
              console.log(`📄 [Content Item] Found upload with ID ${uploadId}:`, uploadData)

              const fileUrl = uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl

              if (!fileUrl || !fileUrl.startsWith("http")) {
                console.log(`⚠️ [Content Item] Upload ${uploadId} has no valid URL`)
                return null
              }

              return {
                id: uploadId,
                title: uploadData.title || uploadData.originalFileName || uploadData.fileName || "Untitled",
                originalFileName: uploadData.originalFileName || uploadData.fileName || "Unknown",
                fileUrl: fileUrl,
                thumbnailUrl: uploadData.thumbnailUrl,
                fileType: uploadData.fileType || uploadData.mimeType || "application/octet-stream",
                fileSize: uploadData.fileSize || uploadData.size || 0,
                category: uploadData.category || uploadData.contentType || "document",
                duration: uploadData.duration,
                uploadedAt: uploadData.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              }
            }
            return null
          } catch (error) {
            console.error(`Error fetching upload ${uploadId}:`, error)
            return null
          }
        })

        const uploadResults = await Promise.all(uploadPromises)
        content = uploadResults.filter(Boolean)

        console.log(`✅ [Content Source 4] Found ${content.length} valid items from contentItems array`)
      }

      // Log final content count
      if (content.length === 0) {
        console.log(`❌ [Product Box Content] No content found for product box ${params.id} in any collection`)
      } else {
        console.log(`✅ [Product Box Content] Found ${content.length} total content items`)
      }

      return NextResponse.json({
        success: true,
        content,
        isOwner,
        hasPurchased,
        productBox: {
          id: params.id,
          title: productBoxData?.title,
          description: productBoxData?.description,
          creatorName: productBoxData?.creatorName,
          creatorUsername: productBoxData?.creatorUsername,
        },
      })
    } catch (contentError) {
      console.error(`❌ [Product Box Content] Error fetching content:`, contentError)

      return NextResponse.json({
        success: false,
        content: [],
        error: "Content fetch error",
        details: contentError.message,
      })
    }
  } catch (error) {
    console.error(`❌ [Product Box Content] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
