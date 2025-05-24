import type Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("Stripe-Signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  switch (event.type) {
    case "checkout.session.completed":
      // Handle successful checkout
      const session = event.data.object as Stripe.Checkout.Session

      // Check if this is a premium content purchase
      if (session.metadata?.creatorId) {
        try {
          console.log(`🪝 WEBHOOK: Processing premium content purchase for creator ${session.metadata.creatorId}`)

          // Get the buyer ID from metadata
          const buyerId = session.metadata?.buyerId
          const creatorId = session.metadata?.creatorId

          if (!buyerId) {
            console.log(`🪝 WEBHOOK: No buyer ID in metadata, using customer email: ${session.customer_email}`)

            // Try to find user by email
            if (session.customer_email) {
              const userRecord = await auth.getUserByEmail(session.customer_email)
              if (userRecord) {
                console.log(`🪝 WEBHOOK: Found user by email: ${userRecord.uid}`)

                // Grant access to premium content
                await db.collection("userAccess").doc(userRecord.uid).set(
                  {
                    creatorId: creatorId,
                    accessGranted: true,
                    purchaseDate: new Date(),
                    sessionId: session.id,
                  },
                  { merge: true },
                )

                console.log(`🪝 WEBHOOK: Granted premium access to user ${userRecord.uid} for creator ${creatorId}`)
              }
            }
          } else {
            // Grant access to premium content
            await db.collection("userAccess").doc(buyerId).set(
              {
                creatorId: creatorId,
                accessGranted: true,
                purchaseDate: new Date(),
                sessionId: session.id,
              },
              { merge: true },
            )

            console.log(`🪝 WEBHOOK: Granted premium access to user ${buyerId} for creator ${creatorId}`)
          }

          // Update the checkout session in Firestore
          await db.collection("premiumCheckoutSessions").doc(session.id).update({
            status: "completed",
            completedAt: new Date(),
          })

          console.log(`🪝 WEBHOOK: Updated premium checkout session ${session.id} to completed`)
        } catch (error) {
          console.error("🪝 WEBHOOK ERROR: Failed to process premium content purchase:", error)
        }
      }
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return new NextResponse(null, { status: 200 })
}
