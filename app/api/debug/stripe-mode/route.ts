import { NextResponse } from "next/server"
import { isTestMode } from "@/lib/stripe"

export async function GET() {
  try {
    const testKeyExists = !!process.env.STRIPE_SECRET_KEY_TEST
    const liveKeyExists = !!process.env.STRIPE_SECRET_KEY
    const forceTest = process.env.STRIPE_FORCE_TEST === "true"

    return NextResponse.json({
      mode: isTestMode ? "TEST" : "LIVE",
      environment: process.env.NODE_ENV,
      testKeyExists,
      liveKeyExists,
      forceTest,
      usingKey: isTestMode ? "STRIPE_SECRET_KEY_TEST" : "STRIPE_SECRET_KEY",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
