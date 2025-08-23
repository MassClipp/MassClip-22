import { type NextRequest, NextResponse } from "next/server"
import { db, auth } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Unified Purchases API] Starting request`)
    console.log(`🔍 [Unified Purchases API] Request URL:`, request.url)
    console.log(`🔍 [Unified Purchases API] Request method:`, request.method)

    const authHeader = request.headers.get("authorization")
    console.log(`🔍 [Unified Purchases API] Auth header present:`, !!authHeader)
    console.log(`🔍 [Unified Purchases API] Auth header starts with Bearer:`, authHeader?.startsWith("Bearer "))

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`❌ [Unified Purchases API] Missing or invalid auth header`)
      console.log(`❌ [Unified Purchases API] Auth header value:`, authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log(`🔍 [Unified Purchases API] Token extracted, length:`, token?.length || 0)
    console.log(`🔍 [Unified Purchases API] Token preview:`, token?.substring(0, 20) + "...")

    let decodedToken
    let userId
    try {
      console.log(`🔍 [Unified Purchases API] Attempting to verify token...`)
      decodedToken = await auth.verifyIdToken(token)
      userId = decodedToken.uid
      console.log(`✅ [Unified Purchases API] Token verified for user: ${userId}`)
      console.log(`✅ [Unified Purchases API] Token exp:`, new Date(decodedToken.exp * 1000))
      console.log(`✅ [Unified Purchases API] Token iat:`, new Date(decodedToken.iat * 1000))
    } catch (tokenError) {
      console.error(`❌ [Unified Purchases API] Token verification failed:`, tokenError)
      console.error(`❌ [Unified Purchases API] Token error name:`, tokenError.name)
      console.error(`❌ [Unified Purchases API] Token error message:`, tokenError.message)
      console.error(`❌ [Unified Purchases API] Token error code:`, tokenError.code)
      return NextResponse.json(
        {
          error: "Invalid token",
          details: tokenError.message,
          code: tokenError.code,
        },
        { status: 401 },
      )
    }

    console.log(`🔍 [Unified Purchases API] Fetching purchases for user: ${userId}`)

    const purchases = []

    try {
      // Try to get bundle purchases without ordering first (in case index is missing)
      let bundlePurchasesSnapshot
      try {
        bundlePurchasesSnapshot = await db
          .collection("bundlePurchases")
          .where("buyerUid", "==", userId)
          .orderBy("createdAt", "desc")
          .get()
        console.log(`✅ [Unified Purchases API] Bundle purchases query with ordering successful`)
      } catch (indexError) {
        console.warn("⚠️ [Unified Purchases API] Index missing, using simple query")
        // Fallback to simple query without ordering
        bundlePurchasesSnapshot = await db.collection("bundlePurchases").where("buyerUid", "==", userId).get()
        console.log(`✅ [Unified Purchases API] Bundle purchases simple query successful`)
      }

      console.log(`📊 [Unified Purchases API] Found ${bundlePurchasesSnapshot.docs.length} bundle purchases`)

      for (const doc of bundlePurchasesSnapshot.docs) {
        try {
          const data = doc.data()
          console.log(`🔍 [Unified Purchases API] Processing bundle purchase:`, {
            id: doc.id,
            bundlePrice: data.bundlePrice,
            purchaseAmount: data.purchaseAmount,
            amount: data.amount,
            bundleTitle: data.bundleTitle,
          })

          // Get creator info safely
          let creatorUsername = "Unknown Creator"
          if (data.creatorId) {
            try {
              const creatorDoc = await db.collection("users").doc(data.creatorId).get()
              if (creatorDoc.exists) {
                const creatorData = creatorDoc.data()
                creatorUsername =
                  creatorData?.username || creatorData?.displayName || creatorData?.name || "Unknown Creator"
              }
            } catch (error) {
              console.warn(`⚠️ [Unified Purchases API] Could not fetch creator info for ${data.creatorId}:`, error)
            }
          }

          // Get bundle info safely
          let bundleTitle = data.bundleTitle || "Untitled Bundle"
          let thumbnailUrl = null
          let contentCount = data.contentCount || 0

          if (data.bundleId) {
            try {
              const bundleDoc = await db.collection("bundles").doc(data.bundleId).get()
              if (bundleDoc.exists) {
                const bundleData = bundleDoc.data()
                bundleTitle = bundleData?.title || bundleTitle
                thumbnailUrl = bundleData?.thumbnailUrl || null
                contentCount = bundleData?.contentCount || contentCount
              }
            } catch (error) {
              console.warn(`⚠️ [Unified Purchases API] Could not fetch bundle info for ${data.bundleId}:`, error)
            }
          }

          // Calculate price properly - prioritize bundlePrice, then purchaseAmount, then amount
          let priceInDollars = 0
          if (data.bundlePrice !== undefined && data.bundlePrice !== null) {
            // bundlePrice is already in dollars
            priceInDollars = Number(data.bundlePrice)
            console.log(`💰 [Unified Purchases API] Using bundlePrice: $${priceInDollars}`)
          } else if (data.purchaseAmount !== undefined && data.purchaseAmount !== null) {
            // purchaseAmount is in cents
            priceInDollars = Number(data.purchaseAmount) / 100
            console.log(
              `💰 [Unified Purchases API] Using purchaseAmount: $${priceInDollars} (converted from ${data.purchaseAmount} cents)`,
            )
          } else if (data.amount !== undefined && data.amount !== null) {
            // amount could be in cents or dollars, check the value
            const amountValue = Number(data.amount)
            if (amountValue > 100) {
              // Likely in cents
              priceInDollars = amountValue / 100
              console.log(
                `💰 [Unified Purchases API] Using amount as cents: $${priceInDollars} (converted from ${amountValue} cents)`,
              )
            } else {
              // Likely in dollars
              priceInDollars = amountValue
              console.log(`💰 [Unified Purchases API] Using amount as dollars: $${priceInDollars}`)
            }
          } else {
            console.warn(`⚠️ [Unified Purchases API] No price found for purchase ${doc.id}`)
          }

          purchases.push({
            id: doc.id,
            title: bundleTitle,
            description: data.description || "",
            price: priceInDollars,
            currency: "usd",
            status: "completed",
            createdAt: data.createdAt || data.completedAt || new Date(),
            updatedAt: data.updatedAt || data.createdAt || new Date(),
            bundleId: data.bundleId,
            creatorId: data.creatorId,
            creatorUsername,
            type: "bundle",
            thumbnailUrl,
            metadata: {
              title: bundleTitle,
              description: data.description || "",
              contentCount,
              thumbnailUrl,
              bundlePrice: data.bundlePrice,
              purchaseAmount: data.purchaseAmount,
              amount: data.amount,
            },
          })
        } catch (docError) {
          console.error(`❌ [Unified Purchases API] Error processing bundle purchase ${doc.id}:`, docError)
          // Continue processing other purchases instead of failing completely
        }
      }
    } catch (bundleError) {
      console.error(`❌ [Unified Purchases API] Error fetching bundle purchases:`, bundleError)
      // Don't fail completely, just log the error and continue
    }

    // Try to get product box purchases (if collection exists)
    try {
      let productBoxPurchasesSnapshot
      try {
        productBoxPurchasesSnapshot = await db
          .collection("productBoxPurchases")
          .where("buyerUid", "==", userId)
          .orderBy("createdAt", "desc")
          .get()
        console.log(`✅ [Unified Purchases API] Product box purchases query with ordering successful`)
      } catch (indexError) {
        console.warn("⚠️ [Unified Purchases API] Product box index missing, using simple query")
        productBoxPurchasesSnapshot = await db.collection("productBoxPurchases").where("buyerUid", "==", userId).get()
        console.log(`✅ [Unified Purchases API] Product box purchases simple query successful`)
      }

      console.log(`📊 [Unified Purchases API] Found ${productBoxPurchasesSnapshot.docs.length} product box purchases`)

      for (const doc of productBoxPurchasesSnapshot.docs) {
        try {
          const data = doc.data()
          console.log(`🔍 [Unified Purchases API] Processing product box purchase:`, {
            id: doc.id,
            productBoxPrice: data.productBoxPrice,
            purchaseAmount: data.purchaseAmount,
            amount: data.amount,
          })

          // Get creator info safely
          let creatorUsername = "Unknown Creator"
          if (data.creatorId) {
            try {
              const creatorDoc = await db.collection("users").doc(data.creatorId).get()
              if (creatorDoc.exists) {
                const creatorData = creatorDoc.data()
                creatorUsername =
                  creatorData?.username || creatorData?.displayName || creatorData?.name || "Unknown Creator"
              }
            } catch (error) {
              console.warn(`⚠️ [Unified Purchases API] Could not fetch creator info for ${data.creatorId}:`, error)
            }
          }

          // Calculate price properly for product boxes
          let priceInDollars = 0
          if (data.productBoxPrice !== undefined && data.productBoxPrice !== null) {
            priceInDollars = Number(data.productBoxPrice)
          } else if (data.purchaseAmount !== undefined && data.purchaseAmount !== null) {
            priceInDollars = Number(data.purchaseAmount) / 100
          } else if (data.amount !== undefined && data.amount !== null) {
            const amountValue = Number(data.amount)
            if (amountValue > 100) {
              priceInDollars = amountValue / 100
            } else {
              priceInDollars = amountValue
            }
          }

          purchases.push({
            id: doc.id,
            title: data.productBoxTitle || "Untitled Product",
            description: data.description || "",
            price: priceInDollars,
            currency: "usd",
            status: "completed",
            createdAt: data.createdAt || data.completedAt || new Date(),
            updatedAt: data.updatedAt || data.createdAt || new Date(),
            productBoxId: data.productBoxId,
            creatorId: data.creatorId,
            creatorUsername,
            type: "product_box",
            metadata: {
              title: data.productBoxTitle || "Untitled Product",
              description: data.description || "",
              contentCount: data.contentCount || 0,
              productBoxPrice: data.productBoxPrice,
              purchaseAmount: data.purchaseAmount,
              amount: data.amount,
            },
          })
        } catch (docError) {
          console.error(`❌ [Unified Purchases API] Error processing product box purchase ${doc.id}:`, docError)
          // Continue processing other purchases instead of failing completely
        }
      }
    } catch (error) {
      console.warn(`⚠️ [Unified Purchases API] Could not fetch product box purchases (collection may not exist):`, error)
    }

    // Sort all purchases by date manually
    purchases.sort((a, b) => {
      const getTime = (dateField: any) => {
        if (!dateField) return 0
        if (dateField.toDate && typeof dateField.toDate === "function") {
          return dateField.toDate().getTime()
        }
        if (dateField.seconds) {
          return dateField.seconds * 1000
        }
        if (typeof dateField === "string") {
          return new Date(dateField).getTime()
        }
        if (dateField instanceof Date) {
          return dateField.getTime()
        }
        return 0
      }

      return getTime(b.createdAt) - getTime(a.createdAt) // Newest first
    })

    console.log(
      `✅ [Unified Purchases API] Returning ${purchases.length} purchases with prices:`,
      purchases.map((p) => ({ id: p.id, title: p.title, price: p.price })),
    )

    return NextResponse.json({
      success: true,
      purchases,
      total: purchases.length,
    })
  } catch (error: any) {
    console.error("❌ [Unified Purchases API] Critical error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch purchases",
        details: error.message,
        errorType: error.constructor.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
