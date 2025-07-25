import { NextResponse } from "next/server"

export async function GET() {
  try {
    const envCheck = {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_CLIENT_ID: !!process.env.STRIPE_CLIENT_ID,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "not set",
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      missingVars: Object.entries(envCheck)
        .filter(([key, value]) => !value || value === "not set")
        .map(([key]) => key),
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to check environment", details: error.message }, { status: 500 })
  }
}
