import { NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore, type FirebaseFirestore } from "firebase-admin/firestore"

type DebugTrace = string[]

let firebaseInitialized = false
let db: FirebaseFirestore | null = null

function initFirebase() {
  if (!firebaseInitialized) {
    initializeFirebaseAdmin()
    db = getFirestore()
    firebaseInitialized = true
    console.log("🔥 Firebase initialized successfully in webhook handler")
  }
  return db!
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }
  return new Stripe(key, { apiVersion: "2023-10-16" })
}

async function storeRawEvent(
  firestore: FirebaseFirestore,
  event: Stripe.Event,
  payload: string,
  debugTrace: DebugTrace,
) {
  try {
    await firestore.collection("stripeWebhookEvents").add({
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date(),
      rawEvent: JSON.parse(payload),
      debugTrace,
    })
    console.log(`🪝 WEBHOOK: Stored raw event ${event.id} in Firestore`)
  } catch (err) {
    console.error("🪝 WEBHOOK ERROR: Failed to store raw event:", err)
  }
}

async function upgradeUserToCreatorPro(
  firestore: FirebaseFirestore,
  userId: string,
  opts: {
    email?: string | null
    sessionId?: string
    subscriptionId?: string
    amountTotal?: number | null
    currency?: string | null
    source?: string
    debugTrace: DebugTrace
  },
) {
  const { email, sessionId, subscriptionId, amountTotal, currency, source = "webhook", debugTrace } = opts
  debugTrace.push(
    `upgradeUserToCreatorPro(userId=${userId}, sessionId=${sessionId || ""}, subscriptionId=${subscriptionId || ""})`,
  )

  // Ensure user exists
  const userRef = firestore.collection("users").doc(userId)
  const userDoc = await userRef.get()
  if (!userDoc.exists) {
    debugTrace.push(`User ${userId} not found in Firestore`)
    throw new Error(`User ${userId} not found`)
  }

  // Update plan and permissions
  await userRef.update({
    plan: "creator_pro",
    permissions: {
      download: true,
      premium: true,
    },
    updatedAt: new Date(),
    paymentStatus: "active",
  })
  debugTrace.push(`Updated user ${userId} plan=creator_pro, premium=true`)

  // Store subscription sub-collection, if applicable
  if (subscriptionId) {
    await userRef.collection("subscriptions").doc(subscriptionId).set(
      {
        subscriptionId,
        status: "active",
        createdAt: new Date(),
        plan: "creator_pro",
        source,
      },
      { merge: true },
    )
    debugTrace.push(`Stored subscription ${subscriptionId} under user ${userId}`)
  }

  // Log payment summary if a session or invoice amount is available
  if (amountTotal || sessionId) {
    await firestore.collection("payments").add({
      userId,
      email: email || null,
      amount: amountTotal ?? null,
      currency: currency ?? null,
      status: "completed",
      sessionId: sessionId || null,
      subscriptionId: subscriptionId || null,
      source,
      timestamp: new Date(),
    })
    debugTrace.push(`Logged payment for user ${userId}`)
  }
}

function firstNonEmpty(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v
  }
  return null
}

async function resolveUserFromSession(
  firestore: FirebaseFirestore,
  session: Stripe.Checkout.Session,
  debugTrace: DebugTrace,
) {
  let userId: string | null = null
  let email: string | null = null

  debugTrace.push("Resolving user from checkout.session")

  const md = session.metadata || {}
  const buyerUid = firstNonEmpty((md as any).buyerUid, (md as any).firebaseUid, (md as any).userId)
  const refId = firstNonEmpty(session.client_reference_id || undefined)

  if (buyerUid) {
    userId = buyerUid
    debugTrace.push(`Found userId via session.metadata.buyerUid/firebaseUid/userId: ${userId}`)
  } else if (refId) {
    userId = refId
    debugTrace.push(`Found userId via session.client_reference_id: ${userId}`)
  }

  email = firstNonEmpty((md as any).buyerEmail, session.customer_email || undefined)

  // Fallbacks by customer id then email
  if (!userId && session.customer) {
    try {
      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
      debugTrace.push(`Querying users by stripeCustomerId=${customerId}`)
      const q = await firestore.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()
      if (!q.empty) {
        userId = q.docs[0].id
        debugTrace.push(`Found userId by stripeCustomerId: ${userId}`)
      }
    } catch (err) {
      debugTrace.push(`Error querying by customerId: ${(err as Error).message}`)
    }
  }

  if (!userId && email) {
    try {
      debugTrace.push(`Querying users by email=${email}`)
      const q = await firestore.collection("users").where("email", "==", email).limit(1).get()
      if (!q.empty) {
        userId = q.docs[0].id
        debugTrace.push(`Found userId by email: ${userId}`)
      }
    } catch (err) {
      debugTrace.push(`Error querying by email: ${(err as Error).message}`)
    }
  }

  return { userId, email }
}

async function resolveUserFromInvoiceOrSubscription(
  firestore: FirebaseFirestore,
  stripe: Stripe,
  invoice: Stripe.Invoice | null,
  subscriptionId: string | null,
  debugTrace: DebugTrace,
) {
  let userId: string | null = null
  let email: string | null = null

  debugTrace.push("Resolving user from invoice/subscription")

  // 1) From invoice line metadata (as seen in your event)
  if (invoice) {
    email = firstNonEmpty(invoice.customer_email || undefined)

    const lines = invoice.lines?.data || []
    for (const line of lines) {
      // Try common metadata keys on line items
      const buyerUid = firstNonEmpty(
        (line.metadata as any)?.buyerUid,
        (line.metadata as any)?.firebaseUid,
        (line.metadata as any)?.userId,
      )
      if (buyerUid) {
        userId = buyerUid
        debugTrace.push(`Found userId via invoice line metadata: ${userId}`)
        break
      }
    }

    // Try parent.subscription_details.metadata if provided by API
    if (!userId) {
      const parent = (invoice as any).parent
      const subMeta = parent?.subscription_details?.metadata
      if (subMeta) {
        const buyerUid = firstNonEmpty(subMeta.buyerUid, subMeta.firebaseUid, subMeta.userId)
        if (buyerUid) {
          userId = buyerUid
          debugTrace.push(`Found userId via invoice.parent.subscription_details.metadata: ${userId}`)
        }
      }
    }
  }

  // 2) Load subscription and check metadata
  if (!userId && subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const buyerUid = firstNonEmpty(
        (sub.metadata as any)?.buyerUid,
        (sub.metadata as any)?.firebaseUid,
        (sub.metadata as any)?.userId,
      )
      if (buyerUid) {
        userId = buyerUid
        debugTrace.push(`Found userId via subscription.metadata: ${userId}`)
      }
      if (!email) {
        // Try to pull customer email
        const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
        if (custId) {
          const cust = await stripe.customers.retrieve(custId)
          if (!("deleted" in cust)) {
            email = firstNonEmpty(cust.email || undefined)
          }
        }
      }
    } catch (err) {
      debugTrace.push(`Error retrieving subscription ${subscriptionId}: ${(err as Error).message}`)
    }
  }

  // 3) Fallback by customerId mapping in Firestore
  if (!userId) {
    const customerId =
      (invoice?.customer && typeof invoice.customer === "string" && invoice.customer) || (subscriptionId ? null : null)
    if (customerId) {
      try {
        debugTrace.push(`Querying users by stripeCustomerId=${customerId}`)
        const q = await firestore.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get()
        if (!q.empty) {
          userId = q.docs[0].id
          debugTrace.push(`Found userId by stripeCustomerId: ${userId}`)
        }
      } catch (err) {
        debugTrace.push(`Error querying by customerId: ${(err as Error).message}`)
      }
    }
  }

  // 4) Fallback by email
  if (!userId && email) {
    try {
      debugTrace.push(`Querying users by email=${email}`)
      const q = await firestore.collection("users").where("email", "==", email).limit(1).get()
      if (!q.empty) {
        userId = q.docs[0].id
        debugTrace.push(`Found userId by email: ${userId}`)
      }
    } catch (err) {
      debugTrace.push(`Error querying by email: ${(err as Error).message}`)
    }
  }

  return { userId, email }
}

export async function POST(request: Request) {
  console.log("------------ 🪝 WEBHOOK HANDLER START ------------")
  const debugTrace: DebugTrace = []

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      debugTrace.push("Missing STRIPE_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Server configuration error", debugTrace }, { status: 500 })
    }

    const firestore = initFirebase()
    const stripe = getStripe()

    const payload = await request.text()
    const sig = request.headers.get("stripe-signature")

    if (!sig) {
      debugTrace.push("Missing stripe-signature header")
      return NextResponse.json({ error: "Missing stripe-signature header", debugTrace }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET)
      debugTrace.push(`Verified signature for event ${event.id} (${event.type})`)
    } catch (err: any) {
      debugTrace.push(`Signature verification failed: ${err.message}`)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}`, debugTrace },
        { status: 400 },
      )
    }

    await storeRawEvent(firestore, event, payload, debugTrace)

    // Handle checkout session completed (primary path)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      debugTrace.push(`Handling checkout.session.completed: ${session.id}`)

      const { userId, email } = await resolveUserFromSession(firestore, session, debugTrace)

      if (userId) {
        await upgradeUserToCreatorPro(firestore, userId, {
          email,
          sessionId: session.id,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
          source: "checkout.session.completed",
          debugTrace,
        })
        debugTrace.push(`Completed upgrade for user ${userId} from session ${session.id}`)
      } else {
        debugTrace.push("Could not resolve user from session via metadata/client_reference_id/customerId/email")
        console.error("🪝 WEBHOOK ERROR: Could not find user ID from session or customer")
        return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
      }
    }

    // Handle invoice payment succeeded (subscription lifecycle safety net)
    else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice
      debugTrace.push(`Handling invoice.payment_succeeded: ${invoice.id}`)

      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id || null

      const { userId, email } = await resolveUserFromInvoiceOrSubscription(
        firestore,
        stripe,
        invoice,
        subscriptionId,
        debugTrace,
      )

      if (userId) {
        await upgradeUserToCreatorPro(firestore, userId, {
          email,
          subscriptionId: subscriptionId || undefined,
          amountTotal: invoice.total ?? null,
          currency: invoice.currency ?? null,
          source: "invoice.payment_succeeded",
          debugTrace,
        })
        debugTrace.push(`Completed upgrade for user ${userId} from invoice ${invoice.id}`)
      } else {
        debugTrace.push("Could not resolve user from invoice/subscription")
        console.error("🪝 WEBHOOK ERROR: Could not find user ID from invoice/subscription")
        return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
      }
    }

    // Optionally handle subscription created as another safety net
    else if (event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription
      debugTrace.push(`Handling customer.subscription.created: ${sub.id}`)

      const buyerUid = firstNonEmpty(
        (sub.metadata as any)?.buyerUid,
        (sub.metadata as any)?.firebaseUid,
        (sub.metadata as any)?.userId,
      )
      let email: string | null = null

      // Try load customer email
      try {
        const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id
        if (custId) {
          const stripe = getStripe()
          const cust = await stripe.customers.retrieve(custId)
          if (!("deleted" in cust)) {
            email = firstNonEmpty(cust.email || undefined)
          }
        }
      } catch {
        // ignore
      }

      let userId = buyerUid
      if (!userId && email) {
        const q = await initFirebase().collection("users").where("email", "==", email).limit(1).get()
        if (!q.empty) userId = q.docs[0].id
      }

      if (userId) {
        await upgradeUserToCreatorPro(initFirebase(), userId, {
          email,
          subscriptionId: sub.id,
          amountTotal: null,
          currency: null,
          source: "customer.subscription.created",
          debugTrace,
        })
      } else {
        debugTrace.push("Could not resolve user from subscription.created")
        return NextResponse.json({ error: "Could not find user ID", debugTrace }, { status: 400 })
      }
    }

    // Other events (no-op)
    else {
      debugTrace.push(`No handler for event type: ${event.type}`)
    }

    console.log("------------ 🪝 WEBHOOK HANDLER END ------------")
    return NextResponse.json({ received: true, debugTrace })
  } catch (error: any) {
    console.error("🪝 WEBHOOK ERROR:", error)
    return NextResponse.json({ error: error?.message || "Unknown error in webhook handler" }, { status: 500 })
  }
}
