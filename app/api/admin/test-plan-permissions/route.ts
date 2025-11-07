import { NextResponse } from "next/server"
import { getSubscriptionFeatures } from "@/lib/subscription"

export async function GET() {
  try {
    // Test Faceless Pro permissions
    const facelessProFeatures = getSubscriptionFeatures("faceless_pro")

    // Test Facelessprenuer permissions
    const facelessPrenuerFeatures = getSubscriptionFeatures("facelessprenuer")

    return NextResponse.json({
      facelessPro: {
        plan: "faceless_pro",
        priceId: "price_1SQBMvDheyb0pkWFPGz7vke7",
        features: facelessProFeatures,
      },
      facelessprenuer: {
        plan: "facelessprenuer",
        priceId: process.env.FACELESSPRENUER_FIRST || "Not configured",
        features: facelessPrenuerFeatures,
      },
    })
  } catch (error: any) {
    console.error("Error testing plan permissions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
