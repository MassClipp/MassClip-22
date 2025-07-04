import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from Firebase Auth
    const userRecord = await auth.getUserByEmail(session.user.email)
    const userId = userRecord.uid

    // Query bundles for this creator
    const bundlesRef = db.collection("bundles")
    const snapshot = await bundlesRef.where("creatorId", "==", userId).get()

    const bundles = []
    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Get content items for this bundle
      const contentSnapshot = await db.collection("bundleContent").where("bundleId", "==", doc.id).get()

      const contentItems = contentSnapshot.docs.map((contentDoc) => ({
        id: contentDoc.id,
        ...contentDoc.data(),
      }))

      bundles.push({
        id: doc.id,
        ...data,
        contentItems,
        contentCount: contentItems.length,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      })
    }

    // Sort by creation date (newest first)
    bundles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ bundles })
  } catch (error) {
    console.error("Error fetching bundles:", error)
    return NextResponse.json({ error: "Failed to fetch bundles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from Firebase Auth
    const userRecord = await auth.getUserByEmail(session.user.email)
    const userId = userRecord.uid

    const body = await request.json()
    const { title, description, price, currency = "usd", isActive = true } = body

    if (!title || !price) {
      return NextResponse.json({ error: "Title and price are required" }, { status: 400 })
    }

    // Create bundle document
    const bundleData = {
      title,
      description: description || "",
      price: Number.parseFloat(price),
      currency,
      isActive,
      creatorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      contentCount: 0,
    }

    const bundleRef = await db.collection("bundles").add(bundleData)

    return NextResponse.json({
      id: bundleRef.id,
      ...bundleData,
      contentItems: [],
    })
  } catch (error) {
    console.error("Error creating bundle:", error)
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 })
  }
}
