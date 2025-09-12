import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const bundleId = params.id

    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    if (bundleData?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundleDoc.id,
        ...bundleData,
      },
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const bundleId = params.id
    const body = await request.json()

    console.log("[v0] Bundle update request received:", {
      bundleId,
      userId,
      requestBody: body,
      comparePrice: body.comparePrice,
      comparePriceType: typeof body.comparePrice,
    })

    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    if (bundleData?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description.trim()
    if (body.price !== undefined) updateData.price = Number(body.price)
    if (body.comparePrice !== undefined) {
      updateData.comparePrice = body.comparePrice ? Number.parseFloat(body.comparePrice) : null
      console.log("[v0] Processing comparePrice:", {
        originalValue: body.comparePrice,
        processedValue: updateData.comparePrice,
        isNull: updateData.comparePrice === null,
        isNumber: typeof updateData.comparePrice === "number",
      })
    }
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage
    if (body.active !== undefined) updateData.active = body.active

    console.log("[v0] Final update data being saved:", updateData)

    await db.collection("bundles").doc(bundleId).update(updateData)

    console.log("[v0] Bundle update successful:", {
      bundleId,
      savedComparePrice: updateData.comparePrice,
      updateSuccess: true,
    })

    return NextResponse.json({
      success: true,
      message: "Bundle updated successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error updating:", error)
    return NextResponse.json(
      {
        error: "Failed to update bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const bundleId = params.id
    const body = await request.json()

    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    if (bundleData?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (body.active !== undefined) updateData.active = body.active

    await db.collection("bundles").doc(bundleId).update(updateData)

    return NextResponse.json({
      success: true,
      message: "Bundle status updated successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error updating status:", error)
    return NextResponse.json(
      {
        error: "Failed to update bundle status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const bundleId = params.id

    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    if (bundleData?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete associated content
    const contentQuery = db.collection("productBoxContent").where("productBoxId", "==", bundleId)
    const contentSnapshot = await contentQuery.get()

    const batch = db.batch()
    contentSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // Delete the bundle
    batch.delete(db.collection("bundles").doc(bundleId))

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: "Bundle deleted successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle API] Error deleting:", error)
    return NextResponse.json(
      {
        error: "Failed to delete bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
