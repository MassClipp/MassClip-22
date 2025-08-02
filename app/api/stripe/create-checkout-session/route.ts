import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  try {
    const { productBoxId, buyerUid, successUrl, cancelUrl } = await request.json()

    console.log("🔍 [Checkout Session] Creating session:", { productBoxId, buyerUid })

    if (!productBoxId || !buyerUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get product box details
    const productBoxDoc = await db.collection("productBoxes").doc(productBoxId).get()
    if (!productBoxDoc.exists) {
      // Try bundles collection as fallback
      const bundleDoc = await db.collection("bundles").doc(productBoxId).get()
      if (!bundleDoc.exists) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }
      return await handleBundleCheckout(request, bundleDoc.data()!, productBoxId, buyerUid, successUrl, cancelUrl)
    }

    const productBox = productBoxDoc.data()!
    const creatorId = productBox.creatorId

    if (!creatorId) {
      return NextResponse.json({ error: "Creator not found for this product" }, { status: 404 })
    }

    // Get creator's Stripe account
    const creatorDoc = await db.collection("users").doc(creatorId).get()
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()!
    const stripeAccountId = creatorData.stripeAccountId

    if (!stripeAccountId) {
      return NextResponse.json({ error: "Creator has not connected their Stripe account" }, { status: 400 })
    }

    // Get buyer details for better identification
    let buyerEmail = ""
    let buyerName = ""

    if (buyerUid !== "anonymous") {
      try {
        const { auth } = await import("@/lib/firebase-admin")
        const buyerUser = await auth.getUser(buyerUid)
        buyerEmail = buyerUser.email || ""
        buyerName = buyerUser.displayName || buyerUser.email?.split("@")[0] || ""
      } catch (error) {
        console.warn("⚠️ [Checkout Session] Could not fetch buyer details:", error)
      }
    }

    // Create checkout session with comprehensive metadata including buyer identification
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: productBox.title || "Digital Content",
                description: productBox.description || "",
                images: productBox.thumbnailUrl ? [productBox.thumbnailUrl] : [],
                metadata: {
                  productBoxId,
                  creatorId,
                  buyerUid, // CRITICAL: Include buyer UID in product metadata
                  buyerEmail,
                  buyerName,
                  contentType: "product_box",
                },
              },
              unit_amount: Math.round((productBox.price || 0) * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url:
          successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,

        // CRITICAL: Comprehensive metadata for buyer identification and access granting
        metadata: {
          productBoxId,
          creatorId,
          buyerUid, // Primary buyer identification
          buyerEmail,
          buyerName,
          isAuthenticated: buyerUid !== "anonymous" ? "true" : "false",
          contentType: "product_box",
          itemTitle: productBox.title || "Digital Content",
          creatorUsername: creatorData.username || "",
          timestamp: new Date().toISOString(),
        },

        // Additional buyer identification in customer fields
        customer_email: buyerEmail || undefined,

        // Custom fields to capture buyer information if not authenticated
        custom_fields:
          buyerUid === "anonymous"
            ? [
                {
                  key: "buyer_email",
                  label: { type: "custom", custom: "Email Address" },
                  type: "text",
                  optional: false,
                },
              ]
            : undefined,

        // Automatic tax calculation
        automatic_tax: { enabled: true },

        // Invoice creation for record keeping
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Purchase of ${productBox.title} by ${buyerName || buyerEmail || "Anonymous"}`,
            metadata: {
              productBoxId,
              buyerUid,
              buyerEmail,
              buyerName,
              creatorId,
              contentType: "product_box",
            },
          },
        },
      },
      {
        stripeAccount: stripeAccountId, // Use creator's connected account
      },
    )

    console.log("✅ [Checkout Session] Created session with buyer metadata:", {
      sessionId: session.id,
      buyerUid,
      buyerEmail,
      stripeAccountId,
      metadata: session.metadata,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      stripeAccountId,
      metadata: session.metadata,
    })
  } catch (error: any) {
    console.error("❌ [Checkout Session] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 })
  }
}

// Handle bundle checkout with buyer identification
async function handleBundleCheckout(
  request: NextRequest,
  bundleData: any,
  bundleId: string,
  buyerUid: string,
  successUrl?: string,
  cancelUrl?: string,
) {
  const creatorId = bundleData.creatorId

  if (!creatorId) {
    return NextResponse.json({ error: "Creator not found for this bundle" }, { status: 404 })
  }

  // Get creator's Stripe account
  const creatorDoc = await db.collection("users").doc(creatorId).get()
  if (!creatorDoc.exists) {
    return NextResponse.json({ error: "Creator profile not found" }, { status: 404 })
  }

  const creatorData = creatorDoc.data()!
  const stripeAccountId = creatorData.stripeAccountId

  if (!stripeAccountId) {
    return NextResponse.json({ error: "Creator has not connected their Stripe account" }, { status: 400 })
  }

  // Get buyer details
  let buyerEmail = ""
  let buyerName = ""

  if (buyerUid !== "anonymous") {
    try {
      const { auth } = await import("@/lib/firebase-admin")
      const buyerUser = await auth.getUser(buyerUid)
      buyerEmail = buyerUser.email || ""
      buyerName = buyerUser.displayName || buyerUser.email?.split("@")[0] || ""
    } catch (error) {
      console.warn("⚠️ [Bundle Checkout] Could not fetch buyer details:", error)
    }
  }

  // Create checkout session for bundle with comprehensive buyer metadata
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: bundleData.title || "Digital Bundle",
              description: bundleData.description || "",
              images: bundleData.customPreviewThumbnail ? [bundleData.customPreviewThumbnail] : [],
              metadata: {
                bundleId,
                creatorId,
                buyerUid, // CRITICAL: Include buyer UID in product metadata
                buyerEmail,
                buyerName,
                contentType: "bundle",
              },
            },
            unit_amount: Math.round((bundleData.price || 0) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,

      // CRITICAL: Comprehensive metadata for buyer identification and access granting
      metadata: {
        bundleId,
        productBoxId: bundleId, // For compatibility
        creatorId,
        buyerUid, // Primary buyer identification
        buyerEmail,
        buyerName,
        isAuthenticated: buyerUid !== "anonymous" ? "true" : "false",
        contentType: "bundle",
        itemTitle: bundleData.title || "Digital Bundle",
        creatorUsername: creatorData.username || "",
        timestamp: new Date().toISOString(),
      },

      // Additional buyer identification
      customer_email: buyerEmail || undefined,

      // Custom fields for anonymous buyers
      custom_fields:
        buyerUid === "anonymous"
          ? [
              {
                key: "buyer_email",
                label: { type: "custom", custom: "Email Address" },
                type: "text",
                optional: false,
              },
            ]
          : undefined,

      // Automatic tax and invoice
      automatic_tax: { enabled: true },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Purchase of ${bundleData.title} by ${buyerName || buyerEmail || "Anonymous"}`,
          metadata: {
            bundleId,
            buyerUid,
            buyerEmail,
            buyerName,
            creatorId,
            contentType: "bundle",
          },
        },
      },
    },
    {
      stripeAccount: stripeAccountId, // Use creator's connected account
    },
  )

  console.log("✅ [Bundle Checkout] Created session with buyer metadata:", {
    sessionId: session.id,
    buyerUid,
    buyerEmail,
    stripeAccountId,
    metadata: session.metadata,
  })

  return NextResponse.json({
    sessionId: session.id,
    url: session.url,
    stripeAccountId,
    metadata: session.metadata,
  })
}
