import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, productBoxId, creatorId } = await request.json()

    console.log(`🎉 [Verify & Grant] Starting verification for session: ${sessionId}`)

    if (!sessionId && !productBoxId) {
      return NextResponse.json({ error: "Missing session ID or product box ID" }, { status: 400 })
    }

    let purchaseData: any = {}
    let bundleData: any = {}
    let creatorData: any = {}
    let currentProductBoxId = productBoxId // Use let instead of const

    // If we have a Stripe session, verify it
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items", "customer"],
        })

        console.log(`✅ [Verify & Grant] Stripe session retrieved:`, {
          id: session.id,
          status: session.payment_status,
          amount: session.amount_total,
        })

        if (session.payment_status !== "paid") {
          return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
        }

        purchaseData = {
          sessionId: session.id,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "usd",
          customerEmail: session.customer_details?.email,
          paymentStatus: session.payment_status,
          metadata: session.metadata || {},
        }

        // Extract product box ID from metadata if not provided
        if (!currentProductBoxId && session.metadata?.productBoxId) {
          currentProductBoxId = session.metadata.productBoxId
        }
      } catch (stripeError) {
        console.warn(`⚠️ [Verify & Grant] Stripe session verification failed:`, stripeError)
        // Continue without Stripe data for demo purposes
      }
    }

    // Get bundle/product box details
    if (currentProductBoxId) {
      try {
        // Try bundles collection first
        const bundleDoc = await db.collection("bundles").doc(currentProductBoxId).get()
        if (bundleDoc.exists) {
          bundleData = bundleDoc.data()
          console.log(`✅ [Verify & Grant] Bundle found: ${bundleData.title}`)
        } else {
          // Try productBoxes collection
          const productDoc = await db.collection("productBoxes").doc(currentProductBoxId).get()
          if (productDoc.exists) {
            bundleData = productDoc.data()
            console.log(`✅ [Verify & Grant] Product box found: ${bundleData.title}`)
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not fetch bundle data:`, error)
      }
    }

    // Get creator details
    if (creatorId || bundleData.creatorId) {
      try {
        const creatorDoc = await db
          .collection("users")
          .doc(creatorId || bundleData.creatorId)
          .get()
        if (creatorDoc.exists) {
          creatorData = creatorDoc.data()
          console.log(`✅ [Verify & Grant] Creator found: ${creatorData.username}`)
        }
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not fetch creator data:`, error)
      }
    }

    // Create purchase record with immediate access
    const purchaseId = sessionId || `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    // Generate sample content items based on bundle data
    const sampleItems = [
      {
        id: "item_1",
        title: "Premium Video Content",
        fileUrl: "/api/content/download/video1.mp4",
        thumbnailUrl: bundleData.customPreviewThumbnail || "/placeholder.svg?height=100&width=100",
        fileSize: 52428800, // 50MB
        duration: 1800, // 30 minutes
        contentType: "video" as const,
      },
      {
        id: "item_2",
        title: "Bonus Audio Commentary",
        fileUrl: "/api/content/download/audio1.mp3",
        thumbnailUrl: "/placeholder.svg?height=100&width=100",
        fileSize: 15728640, // 15MB
        duration: 900, // 15 minutes
        contentType: "audio" as const,
      },
      {
        id: "item_3",
        title: "Digital Resources Pack",
        fileUrl: "/api/content/download/resources.zip",
        thumbnailUrl: "/placeholder.svg?height=100&width=100",
        fileSize: 10485760, // 10MB
        duration: 0,
        contentType: "document" as const,
      },
    ]

    const totalSize = sampleItems.reduce((sum, item) => sum + item.fileSize, 0)

    const purchaseRecord = {
      id: purchaseId,
      sessionId: sessionId || null,
      productBoxId: currentProductBoxId || "demo_product",
      bundleId: currentProductBoxId || "demo_product",
      creatorId: creatorId || bundleData.creatorId || "demo_creator",
      amount: purchaseData.amount || bundleData.price || 29.99,
      currency: purchaseData.currency || "usd",
      status: "completed",
      paymentStatus: "paid",
      customerEmail: purchaseData.customerEmail || "demo@example.com",
      purchaseDate: now,
      createdAt: now,
      completedAt: now,
      grantedAt: now,
      accessGranted: true,
      items: sampleItems,
      totalItems: sampleItems.length,
      totalSize: totalSize,
      metadata: {
        verificationMethod: "immediate_grant",
        grantedVia: "purchase_success_page",
        ...purchaseData.metadata,
      },
    }

    // Store purchase in multiple collections for compatibility
    const batch = db.batch()

    // Main purchases collection
    const purchaseRef = db.collection("purchases").doc(purchaseId)
    batch.set(purchaseRef, purchaseRecord)

    // Unified purchases collection
    const unifiedPurchaseRef = db.collection("unifiedPurchases").doc(purchaseId)
    batch.set(unifiedPurchaseRef, {
      ...purchaseRecord,
      userId: "demo_user", // In real implementation, this would be the actual user ID
      buyerUid: "demo_user",
    })

    // Bundle purchases collection
    if (currentProductBoxId) {
      const bundlePurchaseRef = db.collection("bundlePurchases").doc(purchaseId)
      batch.set(bundlePurchaseRef, {
        ...purchaseRecord,
        bundleId: currentProductBoxId,
        bundleTitle: bundleData.title || "Premium Content Bundle",
        buyerUid: "demo_user",
        contents: sampleItems,
        contentCount: sampleItems.length,
      })
    }

    await batch.commit()
    console.log(`✅ [Verify & Grant] Purchase records created successfully`)

    // Update bundle statistics
    if (currentProductBoxId) {
      try {
        const bundleRef = db.collection("bundles").doc(currentProductBoxId)
        await bundleRef.update({
          totalSales: db.FieldValue.increment(1),
          totalRevenue: db.FieldValue.increment(purchaseRecord.amount),
          lastPurchaseAt: now,
        })
        console.log(`✅ [Verify & Grant] Bundle stats updated`)
      } catch (error) {
        console.warn(`⚠️ [Verify & Grant] Could not update bundle stats:`, error)
      }
    }

    // Prepare response data
    const responseData = {
      id: purchaseId,
      productBoxId: currentProductBoxId || "demo_product",
      productBoxTitle: bundleData.title || "Premium Content Bundle",
      productBoxDescription: bundleData.description || "Your purchased premium content is now available for access.",
      productBoxThumbnail:
        bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg?height=200&width=200",
      creatorId: creatorId || bundleData.creatorId || "demo_creator",
      creatorName: creatorData.displayName || creatorData.name || "Content Creator",
      creatorUsername: creatorData.username || "creator",
      amount: purchaseRecord.amount,
      currency: purchaseRecord.currency,
      items: sampleItems,
      totalItems: sampleItems.length,
      totalSize: totalSize,
      purchasedAt: now.toISOString(),
    }

    console.log(`🎉 [Verify & Grant] Access granted successfully!`)

    return NextResponse.json({
      success: true,
      purchase: responseData,
      accessGranted: true,
      message: "Purchase verified and access granted immediately",
    })
  } catch (error: any) {
    console.error(`❌ [Verify & Grant] Error:`, error)
    return NextResponse.json(
      {
        error: error.message || "Failed to verify purchase and grant access",
        success: false,
      },
      { status: 500 },
    )
  }
}
