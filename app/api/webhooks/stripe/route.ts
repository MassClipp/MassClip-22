import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Enhanced logging function
function logWebhookEvent(level: "info" | "error" | "warn", message: string, data?: any, requestId?: string) {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    level,
    message,
    requestId,
    ...data,
  }

  console.log(`[${level.toUpperCase()}] [Webhook] ${message}`, logData)

  // Store critical errors in Firebase for analysis
  if (level === "error") {
    try {
      db.collection("webhookLogs")
        .add({
          ...logData,
          createdAt: new Date(),
        })
        .catch((err) => console.error("Failed to log to Firebase:", err))
    } catch (e) {
      // Fail silently to not break webhook processing
    }
  }
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  logWebhookEvent(
    "info",
    "Webhook request received",
    {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
    },
    requestId,
  )

  try {
    // Step 1: Get request body and signature
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    logWebhookEvent(
      "info",
      "Request body and signature extracted",
      {
        bodyLength: body.length,
        hasSignature: !!signature,
        signaturePreview: signature?.substring(0, 50) + "...",
      },
      requestId,
    )

    if (!signature) {
      logWebhookEvent("error", "Missing Stripe signature header", {}, requestId)
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Step 2: Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
      logWebhookEvent(
        "info",
        "Webhook signature verified successfully",
        {
          eventId: event.id,
          eventType: event.type,
          livemode: event.livemode,
        },
        requestId,
      )
    } catch (err: any) {
      logWebhookEvent(
        "error",
        "Webhook signature verification failed",
        {
          error: err.message,
          signatureLength: signature?.length,
          bodyLength: body.length,
          endpointSecretLength: endpointSecret?.length,
        },
        requestId,
      )
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Step 3: Process checkout.session.completed events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      logWebhookEvent(
        "info",
        "Processing checkout session completed",
        {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
        },
        requestId,
      )

      // Step 4: Extract and validate metadata
      const buyerUid = session.metadata?.buyerUid
      const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
      const itemType = session.metadata?.itemType || session.metadata?.contentType || "bundle"
      const creatorId = session.metadata?.creatorId

      if (!buyerUid) {
        logWebhookEvent(
          "error",
          "Missing buyerUid in session metadata",
          {
            sessionId: session.id,
            metadata: session.metadata,
          },
          requestId,
        )
        return NextResponse.json({ error: "Missing buyerUid in metadata" }, { status: 400 })
      }

      if (!bundleId) {
        logWebhookEvent(
          "error",
          "Missing bundleId/productBoxId in session metadata",
          {
            sessionId: session.id,
            metadata: session.metadata,
          },
          requestId,
        )
        return NextResponse.json({ error: "Missing bundleId in metadata" }, { status: 400 })
      }

      if (!creatorId) {
        logWebhookEvent(
          "error",
          "Missing creatorId in session metadata",
          {
            sessionId: session.id,
            metadata: session.metadata,
          },
          requestId,
        )
        return NextResponse.json({ error: "Missing creatorId in metadata" }, { status: 400 })
      }

      logWebhookEvent(
        "info",
        "Metadata validation passed",
        {
          buyerUid,
          bundleId,
          itemType,
          creatorId,
        },
        requestId,
      )

      // Step 5: Check if purchase already exists (prevent duplicates)
      try {
        const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
        if (existingPurchase.exists) {
          logWebhookEvent(
            "warn",
            "Purchase already exists, skipping duplicate processing",
            {
              sessionId: session.id,
              existingData: existingPurchase.data(),
            },
            requestId,
          )
          return NextResponse.json({ received: true, status: "duplicate_skipped" })
        }
      } catch (dbError: any) {
        logWebhookEvent(
          "error",
          "Failed to check for existing purchase",
          {
            sessionId: session.id,
            error: dbError.message,
          },
          requestId,
        )
        // Continue processing despite this error
      }

      // Step 6: Look up bundle/item data
      let itemData: any = null
      let creatorData: any = null

      try {
        logWebhookEvent("info", "Looking up item data", { bundleId, itemType }, requestId)

        // Try bundles collection first
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          itemData = { id: bundleDoc.id, ...bundleDoc.data() }
          logWebhookEvent(
            "info",
            "Found bundle data",
            {
              bundleId,
              title: itemData.title,
              creatorId: itemData.creatorId,
            },
            requestId,
          )
        } else {
          // Try productBoxes collection
          const productBoxDoc = await db.collection("productBoxes").doc(bundleId).get()
          if (productBoxDoc.exists) {
            itemData = { id: productBoxDoc.id, ...productBoxDoc.data() }
            logWebhookEvent(
              "info",
              "Found product box data",
              {
                productBoxId: bundleId,
                title: itemData.title,
                creatorId: itemData.creatorId,
              },
              requestId,
            )
          }
        }

        if (!itemData) {
          logWebhookEvent(
            "error",
            "Item not found in database",
            {
              bundleId,
              itemType,
              searchedCollections: ["bundles", "productBoxes"],
            },
            requestId,
          )
          return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        // Verify creator ID matches
        if (itemData.creatorId !== creatorId) {
          logWebhookEvent(
            "error",
            "Creator ID mismatch",
            {
              sessionCreatorId: creatorId,
              itemCreatorId: itemData.creatorId,
              bundleId,
            },
            requestId,
          )
          return NextResponse.json({ error: "Creator ID mismatch" }, { status: 400 })
        }
      } catch (error: any) {
        logWebhookEvent(
          "error",
          "Database lookup failed",
          {
            bundleId,
            error: error.message,
            stack: error.stack,
          },
          requestId,
        )
        return NextResponse.json({ error: "Database lookup failed" }, { status: 500 })
      }

      // Step 7: Look up creator data
      try {
        if (itemData.creatorId) {
          const creatorDoc = await db.collection("users").doc(itemData.creatorId).get()
          if (creatorDoc.exists) {
            creatorData = creatorDoc.data()
            logWebhookEvent(
              "info",
              "Found creator data",
              {
                creatorId: itemData.creatorId,
                displayName: creatorData.displayName,
                username: creatorData.username,
                hasStripeAccount: !!creatorData.stripeAccountId,
              },
              requestId,
            )
          } else {
            logWebhookEvent(
              "warn",
              "Creator not found in database",
              {
                creatorId: itemData.creatorId,
              },
              requestId,
            )
          }
        }
      } catch (error: any) {
        logWebhookEvent(
          "error",
          "Creator lookup failed",
          {
            creatorId: itemData.creatorId,
            error: error.message,
          },
          requestId,
        )
        // Continue processing without creator data
      }

      // Step 8: Create purchase record
      const purchaseData = {
        // Purchase identifiers
        sessionId: session.id,
        paymentIntentId: session.payment_intent,

        // Buyer information
        buyerUid: buyerUid,
        buyerEmail: session.customer_details?.email || "",
        buyerName: session.customer_details?.name || "",

        // Item information
        itemId: bundleId,
        itemType: itemType,
        bundleId: itemType === "bundle" ? bundleId : null,
        productBoxId: itemType === "product_box" ? bundleId : null,
        title: itemData.title || "Untitled",
        description: itemData.description || "",
        thumbnailUrl: itemData.thumbnailUrl || itemData.customPreviewThumbnail || "",
        downloadUrl: itemData.downloadUrl || "",
        fileSize: itemData.fileSize || 0,
        fileType: itemData.fileType || "",
        duration: itemData.duration || 0,

        // Creator information
        creatorId: itemData.creatorId || "",
        creatorName: creatorData?.displayName || creatorData?.username || "Unknown Creator",
        creatorUsername: creatorData?.username || "",
        creatorStripeAccountId: creatorData?.stripeAccountId || "",

        // Purchase details
        amount: (session.amount_total || 0) / 100, // Convert from cents
        currency: session.currency || "usd",
        status: "completed",

        // Access information
        accessUrl: itemType === "bundle" ? `/bundles/${bundleId}` : `/product-box/${bundleId}/content`,
        accessGranted: true,
        downloadCount: 0,

        // Timestamps
        purchasedAt: new Date(),
        createdAt: new Date(),

        // Metadata
        webhookProcessed: true,
        webhookRequestId: requestId,
        environment: process.env.NODE_ENV === "production" ? "live" : "test",
        processingTimeMs: Date.now() - startTime,
      }

      try {
        // Write to bundlePurchases collection
        await db.collection("bundlePurchases").doc(session.id).set(purchaseData)
        logWebhookEvent(
          "info",
          "Purchase record created successfully",
          {
            sessionId: session.id,
            buyerUid,
            amount: purchaseData.amount,
            currency: purchaseData.currency,
          },
          requestId,
        )

        // Step 9: Update creator's sales stats
        if (itemData.creatorId && creatorData) {
          try {
            const creatorRef = db.collection("users").doc(itemData.creatorId)
            await creatorRef.update({
              totalSales: (creatorData.totalSales || 0) + purchaseData.amount,
              totalPurchases: (creatorData.totalPurchases || 0) + 1,
              lastSaleAt: new Date(),
            })
            logWebhookEvent(
              "info",
              "Creator sales stats updated",
              {
                creatorId: itemData.creatorId,
                newTotalSales: (creatorData.totalSales || 0) + purchaseData.amount,
                newTotalPurchases: (creatorData.totalPurchases || 0) + 1,
              },
              requestId,
            )
          } catch (error: any) {
            logWebhookEvent(
              "error",
              "Failed to update creator stats",
              {
                creatorId: itemData.creatorId,
                error: error.message,
              },
              requestId,
            )
            // Don't fail the webhook for this
          }
        }

        // Step 10: Update item download/purchase count
        try {
          const itemRef =
            itemType === "bundle" ? db.collection("bundles").doc(bundleId) : db.collection("productBoxes").doc(bundleId)

          await itemRef.update({
            downloadCount: (itemData.downloadCount || 0) + 1,
            lastPurchaseAt: new Date(),
          })
          logWebhookEvent(
            "info",
            "Item stats updated",
            {
              itemId: bundleId,
              itemType,
              newDownloadCount: (itemData.downloadCount || 0) + 1,
            },
            requestId,
          )
        } catch (error: any) {
          logWebhookEvent(
            "error",
            "Failed to update item stats",
            {
              itemId: bundleId,
              itemType,
              error: error.message,
            },
            requestId,
          )
          // Don't fail the webhook for this
        }
      } catch (error: any) {
        logWebhookEvent(
          "error",
          "Failed to create purchase record",
          {
            sessionId: session.id,
            error: error.message,
            stack: error.stack,
            purchaseData: JSON.stringify(purchaseData, null, 2),
          },
          requestId,
        )
        return NextResponse.json({ error: "Failed to create purchase record" }, { status: 500 })
      }

      const processingTime = Date.now() - startTime
      logWebhookEvent(
        "info",
        "Webhook processing completed successfully",
        {
          sessionId: session.id,
          processingTimeMs: processingTime,
          totalSteps: 10,
        },
        requestId,
      )
    } else {
      logWebhookEvent(
        "info",
        "Webhook event type not handled",
        {
          eventType: event.type,
          eventId: event.id,
        },
        requestId,
      )
    }

    return NextResponse.json({
      received: true,
      requestId,
      processingTimeMs: Date.now() - startTime,
    })
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    logWebhookEvent(
      "error",
      "Unexpected webhook error",
      {
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
      },
      requestId,
    )

    return NextResponse.json(
      {
        error: "Internal server error",
        requestId,
        processingTimeMs: processingTime,
      },
      { status: 500 },
    )
  }
}
