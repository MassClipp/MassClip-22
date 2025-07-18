import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { headers } from "next/headers"

async function getAuthToken(request: NextRequest): Promise<string | null> {
  const headersList = headers()
  const authorization = headersList.get("Authorization")
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null
  }

  return authorization.split("Bearer ")[1]
}

export async function GET(request: NextRequest) {
  try {
    // Get Firebase auth token
    const token = await getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔍 [Product Box Lookup] User ID: ${userId}`)

    // Get search params
    const searchParams = request.nextUrl.searchParams
    const productBoxId = searchParams.get("id")
    const creatorId = searchParams.get("creatorId")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // Collection paths to check
    const collectionPaths = [
      "productBoxes",
      "product-boxes",
      "productboxes",
      "products",
      "premium-content",
      "premiumContent",
    ]

    const results = {}

    // If specific ID is provided, check that product box
    if (productBoxId) {
      console.log(`🔍 [Product Box Lookup] Looking for product box ID: ${productBoxId}`)

      for (const path of collectionPaths) {
        try {
          const docRef = db.collection(path).doc(productBoxId)
          const doc = await docRef.get()

          if (doc.exists) {
            results[path] = {
              found: true,
              data: {
                id: doc.id,
                ...doc.data(),
              },
            }
            console.log(`✅ [Product Box Lookup] Found in ${path} collection`)
          } else {
            results[path] = { found: false }
          }
        } catch (error) {
          results[path] = {
            found: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      }
    }

    // If creator ID is provided, find all product boxes for that creator
    if (creatorId) {
      console.log(`🔍 [Product Box Lookup] Looking for product boxes by creator: ${creatorId}`)

      const creatorResults = {}

      for (const path of collectionPaths) {
        try {
          const querySnapshot = await db.collection(path).where("creatorId", "==", creatorId).limit(limit).get()

          if (!querySnapshot.empty) {
            creatorResults[path] = {
              found: true,
              count: querySnapshot.size,
              items: querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })),
            }
            console.log(`✅ [Product Box Lookup] Found ${querySnapshot.size} items in ${path} collection`)
          } else {
            creatorResults[path] = { found: false }
          }
        } catch (error) {
          creatorResults[path] = {
            found: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      }

      results["byCreator"] = creatorResults
    }

    // If no specific search, find recent product boxes
    if (!productBoxId && !creatorId) {
      console.log(`🔍 [Product Box Lookup] Looking for recent product boxes`)

      const recentResults = {}

      for (const path of collectionPaths) {
        try {
          const querySnapshot = await db.collection(path).orderBy("createdAt", "desc").limit(limit).get()

          if (!querySnapshot.empty) {
            recentResults[path] = {
              found: true,
              count: querySnapshot.size,
              items: querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })),
            }
            console.log(`✅ [Product Box Lookup] Found ${querySnapshot.size} recent items in ${path} collection`)
          } else {
            recentResults[path] = { found: false }
          }
        } catch (error) {
          recentResults[path] = {
            found: false,
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      }

      results["recent"] = recentResults
    }

    // Check user's purchases
    try {
      const purchasesQuery = await db
        .collection("purchases")
        .where("userId", "==", userId)
        .where("status", "==", "completed")
        .limit(10)
        .get()

      results["userPurchases"] = {
        found: !purchasesQuery.empty,
        count: purchasesQuery.size,
        items: purchasesQuery.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      }

      console.log(`✅ [Product Box Lookup] Found ${purchasesQuery.size} user purchases`)
    } catch (error) {
      results["userPurchases"] = {
        found: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }

    return NextResponse.json({
      success: true,
      results,
      userId,
    })
  } catch (error) {
    console.error(`❌ [Product Box Lookup] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to lookup product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
