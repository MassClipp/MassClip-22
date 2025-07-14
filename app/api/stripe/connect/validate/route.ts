import { NextResponse, type NextRequest } from "next/server"
import { stripe, isTestMode } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  const { accountId } = await req.json()

  if (typeof accountId !== "string" || !accountId.startsWith("acct_")) {
    return NextResponse.json({ success: false, error: "Account-ID must start with “acct_…”" }, { status: 400 })
  }

  try {
    const account = await stripe.accounts.retrieve(accountId)

    const wrongEnv = (isTestMode && account.livemode) || (!isTestMode && !account.livemode)

    if (wrongEnv) {
      return NextResponse.json(
        {
          success: false,
          error: `This account was created in ${account.livemode ? "LIVE" : "TEST"} mode and can’t be used here.`,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        type: account.type,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        livemode: account.livemode,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
}
