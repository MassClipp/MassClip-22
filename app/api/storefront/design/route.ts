import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const auth = getAuth()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const storefrontDesign = userData?.storefrontDesign || {
      preset: "default",
      customColors: null,
    }

    return NextResponse.json({ storefrontDesign })
  } catch (error) {
    console.error("[v0] Error fetching storefront design:", error)
    return NextResponse.json({ error: "Failed to fetch design" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { preset, customColors } = body

    await db
      .collection("users")
      .doc(userId)
      .update({
        storefrontDesign: {
          preset: preset || "default",
          customColors: customColors || null,
          updatedAt: new Date().toISOString(),
        },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving storefront design:", error)
    return NextResponse.json({ error: "Failed to save design" }, { status: 500 })
  }
}
