import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId") || "cs_test_simulation_123"

  // Mock Stripe session data
  const mockSession = {
    id: sessionId,
    payment_status: "paid",
    amount_total: 2999, // $29.99 in cents
    currency: "usd",
    client_reference_id: "test-user-123",
    customer_details: {
      email: "testuser@example.com",
    },
    metadata: {
      productBoxId: "test-product-box-123",
    },
    subscription: null,
  }

  return NextResponse.json({
    success: true,
    session: mockSession,
    message: "This is a mock Stripe session for testing",
  })
}
