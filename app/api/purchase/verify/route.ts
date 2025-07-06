import { NextResponse } from "next/server"

// This route has been deprecated and replaced with webhook-based purchase verification
// All purchase verification now happens via Stripe webhooks at /api/webhooks/stripe
// The frontend should check the user's purchase records in Firestore instead

export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint has been deprecated",
      message: "Purchase verification is now handled via webhooks. Check your purchases in the dashboard.",
      deprecated: true,
      redirectTo: "/dashboard/purchases",
    },
    { status: 410 }, // 410 Gone - resource no longer available
  )
}

export async function GET() {
  return NextResponse.json(
    {
      error: "This endpoint has been deprecated",
      message: "Purchase verification is now handled via webhooks. Check your purchases in the dashboard.",
      deprecated: true,
      redirectTo: "/dashboard/purchases",
    },
    { status: 410 },
  )
}
