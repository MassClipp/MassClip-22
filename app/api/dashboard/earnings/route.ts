import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { createDefaultEarningsData, safeNumber } from "@/lib/format-utils"

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
    console.log("🚀 Earnings API called")

    // Create safe default data structure
    const defaultData = createDefaultEarningsData()
    console.log("📊 Default data structure created:", defaultData)

    // For now, return enhanced mock data with safe numbers
    const mockData = {
      totalEarnings: safeNumber(2450.75, 0),
      thisMonthEarnings: safeNumber(850.25, 0),
      lastMonthEarnings: safeNumber(725.5, 0),
      last30DaysEarnings: safeNumber(950.75, 0),
      pendingPayout: safeNumber(125.5, 0),
      availableBalance: safeNumber(325.25, 0),
      salesMetrics: {
        totalSales: safeNumber(87, 0),
        thisMonthSales: safeNumber(28, 0),
        last30DaysSales: safeNumber(35, 0),
        averageTransactionValue: safeNumber(28.17, 0),
      },
      accountStatus: {
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        requirementsCount: safeNumber(0, 0),
      },
      recentTransactions: [
        {
          id: "txn_1",
          description: "Premium Video Bundle",
          amount: safeNumber(49.99, 0),
          created: new Date().toISOString(),
          status: "completed",
          currency: "USD",
        },
        {
          id: "txn_2",
          description: "Individual Video Purchase",
          amount: safeNumber(19.99, 0),
          created: new Date(Date.now() - 86400000).toISOString(),
          status: "completed",
          currency: "USD",
        },
        {
          id: "txn_3",
          description: "Subscription Payment",
          amount: safeNumber(29.99, 0),
          created: new Date(Date.now() - 172800000).toISOString(),
          status: "completed",
          currency: "USD",
        },
      ],
      payoutHistory: [],
      monthlyBreakdown: [
        {
          month: "Jan 2024",
          earnings: safeNumber(725.5, 0),
          transactionCount: safeNumber(25, 0),
        },
        {
          month: "Feb 2024",
          earnings: safeNumber(850.25, 0),
          transactionCount: safeNumber(28, 0),
        },
        {
          month: "Mar 2024",
          earnings: safeNumber(950.75, 0),
          transactionCount: safeNumber(35, 0),
        },
      ],
    }

    console.log("📊 Mock data prepared with safe numbers:", mockData)

    // Validate all numbers in the response
    const validateNumbers = (obj: any, path = ""): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key

        if (typeof value === "number") {
          if (!isFinite(value) || isNaN(value)) {
            console.error(`❌ Invalid number at ${currentPath}:`, value)
            throw new Error(`Invalid number detected at ${currentPath}`)
          }
          console.log(`✅ Valid number at ${currentPath}:`, value)
        } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          validateNumbers(value, currentPath)
        }
      }
    }

    // Validate the mock data
    validateNumbers(mockData)
    console.log("✅ All numbers validated successfully")

    return NextResponse.json(mockData, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("❌ Earnings API error:", error)

    // Return safe fallback response even on error
    const fallbackResponse = createDefaultEarningsData()
    console.log("📊 Returning fallback response:", fallbackResponse)

    return NextResponse.json(fallbackResponse, {
      status: 200, // Return 200 to prevent client-side errors
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
}
