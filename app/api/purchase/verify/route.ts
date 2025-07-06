import { type NextRequest, NextResponse } from "next/server"

// This route is deprecated and disabled
// Purchase verification is now handled via webhooks at /api/webhooks/stripe
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated",
      message: "Purchase verification is now handled automatically via webhooks",
      redirect: "/dashboard/purchases",
    },
    { status: 410 }, // Gone
  )
}

// The rest of the original code can be kept here if needed for reference or future use
// However, since the route is deprecated, it's not necessary to include it in the final implementation
