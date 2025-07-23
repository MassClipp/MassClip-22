import { auth, currentUser } from "@clerk/nextjs"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    const { userId } = auth()
    const user = await currentUser()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const settingsUrl = await prismadb.store.findFirst({
      where: {
        userId: userId,
      },
      select: {
        stripeAccountId: true,
      },
    })

    if (!settingsUrl) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const accountId = settingsUrl.stripeAccountId

    if (!accountId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://massclip.pro/dashboard/connect-stripe?refresh=true",
      return_url: "https://massclip.pro/dashboard/connect-stripe?success=true",
      type: "account_onboarding",
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.log("[STRIPE_CONNECT_REFRESH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
