import { type NextRequest, NextResponse } from "next/server"
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase-server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔄 [Title Sync] Starting title synchronization for user:", session.user.id)

    // Get all uploads for the user
    const uploadsQuery = query(collection(db, "uploads"), where("uid", "==", session.user.id))
    const uploadsSnapshot = await getDocs(uploadsQuery)

    const uploads = uploadsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`📁 Found ${uploads.length} uploads to sync`)

    const batch = writeBatch(db)
    let updatesCount = 0

    // For each upload, check and update related collections
    for (const upload of uploads) {
      const uploadId = upload.id
      const correctTitle = upload.title

      // Check free_content
      const freeContentQuery = query(collection(db, "free_content"), where("uploadId", "==", uploadId))
      const freeContentDocs = await getDocs(freeContentQuery)
      freeContentDocs.forEach((doc) => {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date().toISOString() })
          updatesCount++
          console.log(`📝 Syncing free_content: "${data.title}" → "${correctTitle}"`)
        }
      })

      // Check product_box_content
      const productBoxContentQuery = query(collection(db, "product_box_content"), where("uploadId", "==", uploadId))
      const productBoxContentDocs = await getDocs(productBoxContentQuery)
      productBoxContentDocs.forEach((doc) => {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date().toISOString() })
          updatesCount++
          console.log(`📦 Syncing product_box_content: "${data.title}" → "${correctTitle}"`)
        }
      })

      // Check bundle_content
      const bundleContentQuery = query(collection(db, "bundle_content"), where("uploadId", "==", uploadId))
      const bundleContentDocs = await getDocs(bundleContentQuery)
      bundleContentDocs.forEach((doc) => {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date().toISOString() })
          updatesCount++
          console.log(`🎁 Syncing bundle_content: "${data.title}" → "${correctTitle}"`)
        }
      })

      // Check creator_uploads
      const creatorUploadsQuery = query(collection(db, "creator_uploads"), where("uploadId", "==", uploadId))
      const creatorUploadsDocs = await getDocs(creatorUploadsQuery)
      creatorUploadsDocs.forEach((doc) => {
        const data = doc.data()
        if (data.title !== correctTitle) {
          batch.update(doc.ref, { title: correctTitle, updatedAt: new Date().toISOString() })
          updatesCount++
          console.log(`👤 Syncing creator_uploads: "${data.title}" → "${correctTitle}"`)
        }
      })
    }

    // Commit all updates
    if (updatesCount > 0) {
      await batch.commit()
      console.log(`✅ [Title Sync] Successfully synced ${updatesCount} title mismatches`)
    } else {
      console.log("✅ [Title Sync] All titles are already in sync")
    }

    return NextResponse.json({
      success: true,
      uploadsChecked: uploads.length,
      updatesApplied: updatesCount,
      message: updatesCount > 0 ? `Synced ${updatesCount} title mismatches` : "All titles are already in sync",
    })
  } catch (error) {
    console.error("❌ [Title Sync] Error syncing titles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
