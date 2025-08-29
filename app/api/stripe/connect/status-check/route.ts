import { type NextRequest, NextResponse } from "next/server"
import { ConnectedStripeAccountsService } from "@/lib/connected-stripe-accounts-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const refresh = searchParams.get("refresh") === "true"

    console.log("[v0] Status check for userId:", userId, "refresh:", refresh)

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    let account

    if (refresh) {
      console.log("[v0] Refreshing account status from Stripe API...")
      try {
        account = await ConnectedStripeAccountsService.refreshAccountFromStripe(userId)
      } catch (error) {
        console.error("[v0] Failed to refresh from Stripe, falling back to cached data:", error)
        account = await ConnectedStripeAccountsService.getAccount(userId)
      }
    } else {
      account = await ConnectedStripeAccountsService.getAccount(userId)
    }

    if (!account) {
      console.log("[v0] No account found")
      return NextResponse.json({
        connected: false,
        fullySetup: false,
      })
    }

    const fullySetup = ConnectedStripeAccountsService.isAccountFullySetup(account)

    console.log(
      "[v0] Account found, fully setup:",
      fullySetup,
      "charges_enabled:",
      account.charges_enabled,
      "details_submitted:",
      account.details_submitted,
    )

    return NextResponse.json({
      connected: true,
      fullySetup,
      account: {
        stripe_user_id: account.stripe_user_id,
        stripeAccountId: account.stripeAccountId,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        email: account.email,
        country: account.country,
      },
    })
  } catch (error) {
    console.error("[v0] Status check error:", error)
    return NextResponse.json({ error: "Failed to check connection status" }, { status: 500 })
  }
}
