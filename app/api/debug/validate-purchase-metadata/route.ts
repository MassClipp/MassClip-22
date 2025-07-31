import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps } from "firebase-admin/app"
import { cert } from "firebase-admin/app"

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    // Get recent purchases to validate metadata
    const purchasesSnapshot = await db.collection("purchases").orderBy("createdAt", "desc").limit(limit).get()

    const results = {
      totalPurchases: purchasesSnapshot.size,
      validPurchases: 0,
      anonymousPurchases: 0,
      missingMetadata: 0,
      issues: [] as any[],
      summary: {} as any,
    }

    purchasesSnapshot.forEach((doc) => {
      const data = doc.data()
      const purchaseId = doc.id

      // Check for buyer UID
      if (!data.buyerUid) {
        results.anonymousPurchases++
        results.issues.push({
          purchaseId,
          type: "missing_buyer_uid",
          sessionId: data.sessionId,
          createdAt: data.createdAt,
          severity: "critical",
        })
        return
      }

      // Check for essential metadata
      const requiredFields = ["creatorId", "sessionId", "amount", "status"]
      const missingFields = requiredFields.filter((field) => !data[field])

      if (missingFields.length > 0) {
        results.missingMetadata++
        results.issues.push({
          purchaseId,
          type: "missing_metadata",
          missingFields,
          buyerUid: data.buyerUid,
          severity: "warning",
        })
        return
      }

      // Check for purchase type validation
      if (!data.productBoxId && !data.bundleId) {
        results.issues.push({
          purchaseId,
          type: "missing_product_reference",
          buyerUid: data.buyerUid,
          severity: "error",
        })
        return
      }

      results.validPurchases++
    })

    // Generate summary
    results.summary = {
      validPercentage: ((results.validPurchases / results.totalPurchases) * 100).toFixed(2),
      anonymousPercentage: ((results.anonymousPurchases / results.totalPurchases) * 100).toFixed(2),
      criticalIssues: results.issues.filter((i) => i.severity === "critical").length,
      warnings: results.issues.filter((i) => i.severity === "warning").length,
      errors: results.issues.filter((i) => i.severity === "error").length,
    }

    return NextResponse.json({
      success: true,
      validation: results,
      recommendations: [
        results.anonymousPurchases > 0 && "Implement buyer UID validation in checkout flow",
        results.missingMetadata > 0 && "Add metadata validation in webhook processing",
        results.issues.length > 0 && "Review and fix identified purchase issues",
      ].filter(Boolean),
    })
  } catch (error) {
    console.error("Error validating purchase metadata:", error)
    return NextResponse.json({ error: "Failed to validate purchase metadata" }, { status: 500 })
  }
}
