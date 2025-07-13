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

// GET - Get specific bundle
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

    const bundleDoc = await db.collection("bundlesMade").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    if (bundleData.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundleDoc.id,
        ...bundleData,
        createdAt: bundleData.createdAt?.toDate(),
        updatedAt: bundleData.updatedAt?.toDate(),
      },
    })
  } catch (error) {
    console.error("❌ [BundlesMade] Error fetching bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PUT - Update bundle
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

    const bundleDoc = await db.collection("bundlesMade").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    if (bundleData.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description.trim()
    if (body.price !== undefined) updateData.price = Number(body.price)
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage
    if (body.active !== undefined) updateData.active = body.active

    await db.collection("bundlesMade").doc(bundleId).update(updateData)

    return NextResponse.json({
      success: true,
      message: "Bundle updated successfully",
    })
  } catch (error) {
    console.error("❌ [BundlesMade] Error updating bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to update bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE - Delete bundle
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

    const bundleDoc = await db.collection("bundlesMade").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()!

    if (bundleData.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await db.collection("bundlesMade").doc(bundleId).delete()

    return NextResponse.json({
      success: true,
      message: "Bundle deleted successfully",
    })
  } catch (error) {
    console.error("❌ [BundlesMade] Error deleting bundle:", error)
    return NextResponse.json(
      {
        error: "Failed to delete bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
