import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"
import { stripe } from "@/lib/stripe"

// Helper function to verify ID token
async function verifyIdToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Error verifying token:", error)
    return null
  }
}

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id
    console.log(`🔍 [Bundle GET] Fetching bundle: ${bundleId}`)

    // Get bundle document
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    // Check if user owns this bundle
    if (bundleData?.creatorId !== decodedToken.uid) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const bundle = {
      id: bundleDoc.id,
      ...bundleData,
    }

    return NextResponse.json({
      success: true,
      bundle,
    })
  } catch (error) {
    console.error("❌ [Bundle GET] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id
    const body = await request.json()

    console.log(`🔄 [Bundle PUT] Updating bundle: ${bundleId}`, body)

    // Get existing bundle
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const existingData = bundleDoc.data()

    // Check if user owns this bundle
    if (existingData?.creatorId !== decodedToken.uid) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (body.title !== undefined) updateData.title = body.title.trim()
    if (body.description !== undefined) updateData.description = body.description.trim()
    if (body.price !== undefined) updateData.price = body.price
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage
    if (body.active !== undefined) updateData.active = body.active

    // Update bundle in Firestore
    await db.collection("bundles").doc(bundleId).update(updateData)

    // If price changed and Stripe is configured, update Stripe price
    if (body.price !== undefined && body.price !== existingData?.price && stripe && existingData?.productId) {
      try {
        const userData = await db.collection("users").doc(decodedToken.uid).get()
        const userStripeAccount = userData.data()?.stripeAccountId

        if (userStripeAccount) {
          // Create new price in Stripe (prices are immutable)
          const newPrice = await stripe.prices.create(
            {
              unit_amount: Math.round(body.price * 100),
              currency: existingData.currency || "usd",
              product: existingData.productId,
              metadata: {
                bundleId,
                creatorId: decodedToken.uid,
              },
            },
            {
              stripeAccount: userStripeAccount,
            },
          )

          // Update bundle with new price ID
          await db.collection("bundles").doc(bundleId).update({
            priceId: newPrice.id,
          })

          console.log(`✅ [Bundle PUT] Created new Stripe price: ${newPrice.id}`)
        }
      } catch (stripeError) {
        console.error("❌ [Bundle PUT] Stripe error:", stripeError)
        // Don't fail the update for Stripe issues
      }
    }

    console.log(`✅ [Bundle PUT] Bundle updated successfully`)

    return NextResponse.json({
      success: true,
      message: "Bundle updated successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle PUT] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to update bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id
    const body = await request.json()

    console.log(`🔄 [Bundle PATCH] Updating bundle: ${bundleId}`, body)

    // Get existing bundle
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const existingData = bundleDoc.data()

    // Check if user owns this bundle
    if (existingData?.creatorId !== decodedToken.uid) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Update only the provided fields
    const updateData: any = {
      ...body,
      updatedAt: new Date(),
    }

    await db.collection("bundles").doc(bundleId).update(updateData)

    console.log(`✅ [Bundle PATCH] Bundle updated successfully`)

    return NextResponse.json({
      success: true,
      message: "Bundle updated successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle PATCH] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to update bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const decodedToken = await verifyIdToken(request)
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bundleId = params.id
    console.log(`🗑️ [Bundle DELETE] Deleting bundle: ${bundleId}`)

    // Get existing bundle
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    // Check if user owns this bundle
    if (bundleData?.creatorId !== decodedToken.uid) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Delete associated content first
    const contentQuery = await db.collection("productBoxContent").where("productBoxId", "==", bundleId).get()

    const deletePromises = contentQuery.docs.map((doc) => doc.ref.delete())
    await Promise.all(deletePromises)

    // Delete the bundle
    await db.collection("bundles").doc(bundleId).delete()

    console.log(`✅ [Bundle DELETE] Bundle deleted successfully`)

    return NextResponse.json({
      success: true,
      message: "Bundle deleted successfully",
    })
  } catch (error) {
    console.error("❌ [Bundle DELETE] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to delete bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
