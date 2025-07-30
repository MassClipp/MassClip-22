import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-server"
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, addDoc } from "firebase/firestore"
import { getAuth } from "firebase-admin/auth"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const getAdminAuth = getAuth

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Verify Session] Starting session verification...")

    const body = await request.json()
    console.log("📝 [Verify Session] Request body:", { ...body, idToken: "[REDACTED]" })

    const { sessionId, idToken } = body

    if (!sessionId) {
      console.error("❌ [Verify Session] Missing sessionId")
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 [Verify Session] Processing session:", sessionId)

    // Verify Firebase token if provided
    let userId = null
    if (idToken) {
      try {
        console.log("🔐 [Verify Session] Verifying Firebase token...")
        const decodedToken = await getAdminAuth().verifyIdToken(idToken)
        userId = decodedToken.uid
        console.log("✅ [Verify Session] Token verified for user:", userId)
      } catch (error) {
        console.error("❌ [Verify Session] Token verification failed:", error)
        console.log("⚠️ [Verify Session] Continuing without authentication...")
      }
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Get bundle ID from metadata
    const bundleId = session.metadata?.bundleId
    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID not found in session metadata" }, { status: 400 })
    }

    console.log("📦 Fetching bundle:", bundleId)

    // Fetch bundle data from Firestore
    const bundleRef = doc(db, "bundles", bundleId)
    const bundleSnap = await getDoc(bundleRef)

    if (!bundleSnap.exists()) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleSnap.data()
    console.log("📦 Bundle data:", bundleData)

    // Fetch bundle content items
    let bundleItems: any[] = []
    if (bundleData.contentIds && bundleData.contentIds.length > 0) {
      const itemPromises = bundleData.contentIds.map(async (contentId: string) => {
        const itemRef = doc(db, "uploads", contentId)
        const itemSnap = await getDoc(itemRef)
        if (itemSnap.exists()) {
          return { id: contentId, ...itemSnap.data() }
        }
        return null
      })

      const items = await Promise.all(itemPromises)
      bundleItems = items.filter((item) => item !== null)
    }

    // Calculate total size
    const totalSize = bundleItems.reduce((total, item) => {
      return total + (item.fileSize || 0)
    }, 0)

    // Create complete purchase data
    const purchaseData = {
      sessionId,
      bundleId,
      productBoxId: bundleId, // For compatibility
      itemId: bundleId,
      productBoxTitle: bundleData.title || "Untitled Bundle",
      productBoxDescription: bundleData.description || "",
      productBoxThumbnail: bundleData.thumbnail || "",
      bundleTitle: bundleData.title || "Untitled Bundle",
      bundleDescription: bundleData.description || "",
      bundleThumbnail: bundleData.thumbnail || "",
      items: bundleItems,
      totalItems: bundleItems.length,
      totalSize,
      purchaseDate: new Date().toISOString(),
      stripeSessionId: sessionId,
      paymentStatus: "completed",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      customerEmail: session.customer_details?.email || "",
      type: "bundle",
    }

    // Store purchase in main purchases collection
    const purchaseRef = await addDoc(collection(db, "purchases"), purchaseData)
    console.log("💾 Stored purchase:", purchaseRef.id)

    // If user is authenticated, also store in their personal purchases
    if (userId) {
      console.log("👤 Storing for authenticated user:", userId)

      // Store in user's purchases subcollection
      const userPurchaseRef = doc(db, "users", userId, "purchases", purchaseRef.id)
      await setDoc(userPurchaseRef, purchaseData)

      // Update user's bundleAccess
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {
        bundleAccess: arrayUnion(bundleId),
      })
    }

    console.log("✅ Purchase verification complete")

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundleId,
        title: bundleData.title,
        description: bundleData.description,
        thumbnail: bundleData.thumbnail,
        items: bundleItems,
        totalItems: bundleItems.length,
        totalSize,
      },
      purchase: purchaseData,
    })
  } catch (error: any) {
    console.error("❌ [Verify Session] Verification failed:", error)
    return NextResponse.json(
      {
        error: "Failed to verify session",
        details: error.message,
        type: error.name || "UnknownError",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
