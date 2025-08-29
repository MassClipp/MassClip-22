import { type NextRequest, NextResponse } from "next/server"
import { ConnectedStripeAccountsService } from "@/lib/connected-stripe-accounts-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    console.log("[v0] Status check for userId:", userId)

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const account = await ConnectedStripeAccountsService.getAccount(userId)

    if (!account) {
      console.log("[v0] No account found")
      return NextResponse.json({
        connected: false,
        fullySetup: false,
      })
    }

    const fullySetup = ConnectedStripeAccountsService.isAccountFullySetup(account)

    console.log("[v0] Account found, fully setup:", fullySetup)

    return NextResponse.json({
      connected: true,
      fullySetup,
      account: {
        stripe_user_id: account.stripe_user_id,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      },
    })
  } catch (error) {
    console.error("[v0] Status check error:", error)
    return NextResponse.json({ error: "Failed to check connection status" }, { status: 500 })
  }
}
