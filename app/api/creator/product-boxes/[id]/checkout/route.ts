import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth()
    const { id } = params

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const productBox = await db.productBox.findUnique({
      where: {
        id,
        isPublished: true,
      },
      include: {
        creator: true,
      },
    })

    if (!productBox) {
      return new NextResponse("Not found", { status: 404 })
    }

    const user = await db.user.findUnique({
      where: {
        userId: userId,
      },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    const creatorData = await db.creator.findUnique({
      where: {
        userId: productBox.creatorId,
      },
    })

    if (!creatorData || !creatorData.stripeAccountId) {
      return new NextResponse("Creator has not connected Stripe account.", { status: 400 })
    }

    // Calculate 25% platform fee
    const applicationFee = Math.round(productBox.price * 0.25)

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productBox.title,
              description: productBox.description || `Product box by ${creatorData.username}`,
              metadata: {
                productBoxId: id,
                creatorId: productBox.creatorId,
              },
            },
            unit_amount: productBox.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${creatorData.username}`,
      payment_intent_data: {
        application_fee_amount: applicationFee, // 25% platform fee
        transfer_data: {
          destination: creatorData.stripeAccountId,
        },
        metadata: {
          productBoxId: id,
          buyerUid: user.uid,
          creatorUid: productBox.creatorId,
          platformFeeAmount: applicationFee.toString(),
          creatorAmount: (productBox.price - applicationFee).toString(),
        },
      },
      metadata: {
        productBoxId: id,
        buyerUid: user.uid,
        creatorUid: productBox.creatorId,
        type: "product_box_purchase",
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.log("[PRODUCT_BOX_CHECKOUT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
