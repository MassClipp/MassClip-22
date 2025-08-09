import Stripe from "stripe"
import { getApps, initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    } as any),
  })
}
const adminAuth = getAuth()
const adminDb = getFirestore()

async function resolveUidFromSession(session: Stripe.Checkout.Session): Promise<string | null> {
  // 1) metadata.buyerUid (our preferred source)
  const metaUid =
    (session.metadata && (session.metadata as any).buyerUid) ||
    (session.subscription_details && (session.subscription_details as any)?.metadata?.buyerUid) ||
    null
  if (metaUid && typeof metaUid === "string") return metaUid

  // 2) client_reference_id
  if (session.client_reference_id) return session.client_reference_id

  // 3) customer_details.email -> Firebase Auth lookup
  const email = session.customer_details?.email || (session.customer_email as string | null)
  if (email) {
    try {
      const user = await adminAuth.getUserByEmail(email)
      return user.uid
    } catch {
      // Optional: look up in your "users" collection by email if you store profiles there.
      const q = await adminDb.collection("users").where("email", "==", email).limit(1).get()
      if (!q.empty) return q.docs[0].id
    }
  }
  return null
}

async function upsertMembership(
  uid: string,
  payload: {
    plan?: "creator_pro" | "free"
    status?: string
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    currentPeriodEnd?: number | null
    priceId?: string
  },
) {
  const ref = adminDb.collection("memberships").doc(uid)
  const now = Date.now()
  await ref.set(
    {
      plan: payload.plan ?? "creator_pro",
      status: payload.status ?? "active",
      isActive: (payload.status ?? "active") === "active" || (payload.status ?? "active") === "trialing",
      stripeCustomerId: payload.stripeCustomerId || null,
      stripeSubscriptionId: payload.stripeSubscriptionId || null,
      currentPeriodEnd: payload.currentPeriodEnd ? new Date(payload.currentPeriodEnd) : null,
      priceId: payload.priceId || null,
      updatedAt: new Date(now),
      createdAt: new Date(now),
    },
    { merge: true },
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2022-11-15",
  })

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"]!, endpointSecret)
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session

      const uid = await resolveUidFromSession(session)
      if (!uid) {
        console.warn("[webhook] checkout.session.completed: could not resolve user; acknowledging to stop retries.")
        break
      }

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id
      const customerId = (session.customer as string) || (session.customer as any)?.id || null
      const priceId =
        (session.metadata as any)?.priceId ||
        (session.subscription_details as any)?.metadata?.priceId ||
        (session.display_items && (session.display_items[0] as any)?.plan?.id) ||
        null

      await upsertMembership(uid, {
        plan: "creator_pro",
        status: "active",
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId || undefined,
        currentPeriodEnd: null, // will be set on subscription.updated
        priceId: priceId || undefined,
      })
      break
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const uid =
        (sub.metadata as any)?.buyerUid ||
        (typeof sub.client_reference_id === "string" ? (sub.client_reference_id as string) : null) ||
        null

      let resolvedUid = uid
      if (!resolvedUid && typeof sub.customer === "string") {
        try {
          const customer = await stripe.customers.retrieve(sub.customer as string)
          const email = (customer as any)?.email
          if (email) {
            try {
              const user = await adminAuth.getUserByEmail(email)
              resolvedUid = user.uid
            } catch {}
          }
        } catch {}
      }

      if (!resolvedUid) {
        console.warn("[webhook] subscription.upsert: could not resolve user; acknowledging.")
        break
      }

      await upsertMembership(resolvedUid, {
        plan: "creator_pro",
        status: sub.status,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
        priceId: (sub.items?.data?.[0]?.price?.id as string) || undefined,
      })
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const uid = (sub.metadata as any)?.buyerUid || null
      if (uid) {
        await upsertMembership(uid, {
          plan: "free",
          status: "canceled",
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: null,
          priceId: (sub.items?.data?.[0]?.price?.id as string) || undefined,
        })
      } else {
        console.warn("[webhook] subscription.deleted: missing buyerUid; acknowledged.")
      }
      break
    }

    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
}
