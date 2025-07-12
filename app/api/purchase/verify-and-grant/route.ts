import { NextResponse, type NextRequest } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { cookies } from "next/headers"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    console.log("🔍 Verifying purchase for session:", sessionId)

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()
    const auth = getAuth()

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    console.log("✅ Stripe session verified, payment completed")

    // Extract purchase details from session metadata
    const bundleId = session.metadata?.bundleId
    const productBoxId = session.metadata?.productBoxId
    const creatorId = session.metadata?.creatorId
    const customerEmail = session.customer_details?.email

    if (!bundleId && !productBoxId) {
      return NextResponse.json({ error: "No content ID found in session" }, { status: 400 })
    }

    if (!customerEmail) {
      return NextResponse.json({ error: "No customer email found" }, { status: 400 })
    }

    console.log("📧 Customer email:", customerEmail)
    console.log("📦 Content ID:", bundleId || productBoxId)

    // Find or create user by email
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(customerEmail)
      console.log("👤 Found existing user:", userRecord.uid)
    } catch (error) {
      // User doesn't exist, create a new one
      console.log("👤 Creating new user for email:", customerEmail)
      userRecord = await auth.createUser({
        email: customerEmail,
        emailVerified: true,
      })

      // Create user profile in Firestore
      await db.collection("users").doc(userRecord.uid).set({
        email: customerEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: "free",
      })

      console.log("✅ New user created:", userRecord.uid)
    }

    // Create session cookie for the user
    const customToken = await auth.createCustomToken(userRecord.uid)
    const idToken = customToken // In a real scenario, you'd exchange this for an ID token

    // For now, we'll create a session cookie directly
    const sessionCookie = await auth.createSessionCookie(customToken, {
      expiresIn: 60 * 60 * 24 * 14 * 1000, // 2 weeks
    })

    // Set the session cookie
    cookies().set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 14, // 2 weeks
      path: "/",
      sameSite: "lax",
    })

    console.log("🍪 Session cookie set for user")

    // Create purchase record
    const purchaseData = {
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      userId: userRecord.uid,
      bundleId: bundleId || null,
      productBoxId: productBoxId || null,
      creatorId,
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      status: "completed",
      stripeSessionId: sessionId,
      customerEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Store purchase in multiple collections for redundancy
    const batch = db.batch()

    // Main purchases collection
    const purchaseRef = db.collection("purchases").doc(purchaseData.id)
    batch.set(purchaseRef, purchaseData)

    // User's purchases subcollection
    const userPurchaseRef = db.collection("users").doc(userRecord.uid).collection("purchases").doc(purchaseData.id)
    batch.set(userPurchaseRef, purchaseData)

    // Creator's sales subcollection (if creatorId exists)
    if (creatorId) {
      const creatorSaleRef = db.collection("users").doc(creatorId).collection("sales").doc(purchaseData.id)
      batch.set(creatorSaleRef, {
        ...purchaseData,
        buyerId: userRecord.uid,
        buyerEmail: customerEmail,
      })
    }

    // Unified purchases collection for easier querying
    const unifiedPurchaseRef = db.collection("unified_purchases").doc(purchaseData.id)
    batch.set(unifiedPurchaseRef, {
      ...purchaseData,
      type: bundleId ? "bundle" : "product_box",
      contentId: bundleId || productBoxId,
    })

    await batch.commit()
    console.log("✅ Purchase records created successfully")

    // Fetch content data for response
    let contentData = null
    if (bundleId) {
      const bundleDoc = await db.collection("bundles").doc(bundleId).get()
      if (bundleDoc.exists()) {
        contentData = { bundleData: bundleDoc.data() }

        // Fetch creator data
        if (creatorId) {
          const creatorDoc = await db.collection("users").doc(creatorId).get()
          if (creatorDoc.exists()) {
            contentData.bundleData.creatorData = {
              displayName: creatorDoc.data()?.displayName,
              username: creatorDoc.data()?.username,
            }
          }
        }
      }
    } else if (productBoxId) {
      const productBoxDoc = await db.collection("product_boxes").doc(productBoxId).get()
      if (productBoxDoc.exists()) {
        contentData = { productBoxData: productBoxDoc.data() }

        // Fetch creator data
        if (creatorId) {
          const creatorDoc = await db.collection("users").doc(creatorId).get()
          if (creatorDoc.exists()) {
            contentData.productBoxData.creatorData = {
              displayName: creatorDoc.data()?.displayName,
              username: creatorDoc.data()?.username,
            }
          }
        }
      }
    }

    const responseData = {
      success: true,
      message: "Purchase verified and access granted",
      purchase: {
        ...purchaseData,
        ...contentData,
      },
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
      },
    }

    console.log("🎉 Purchase verification completed successfully")
    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("❌ Purchase verification error:", error)
    return NextResponse.json(
      {
        error: "Failed to verify purchase",
        details: error.message,
        success: false,
      },
      { status: 500 },
    )
  }
}
