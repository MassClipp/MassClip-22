import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, Timestamp } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET_TEST

type ProStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive"

function mapSubscriptionStatus(s?: string): ProStatus {
  switch (s) {
    case "active":
    case "trialing":
      return s
    case "past_due":
    case "unpaid":
      return "past_due"
    case "canceled":
      return "canceled"
    default:
      return "inactive"
  }
}

function proFeatures() {
  return {
    unlimitedDownloads: true,
    premiumContent: true,
    noWatermark: true,
    prioritySupport: true,
    platformFeePercentage: 10,
    maxVideosPerBundle: null as number | null,
    maxBundles: null as number | null,
  }
}

async function findUidFromSession(session: Stripe.Checkout.Session): Promise<string | null> {
  // Priority 1: explicit metadata fields
  const meta = session.metadata || {}
  const metaUid =
    (meta.buyerUid as string) ||
    (meta.uid as string) ||
    (meta.userId as string) ||
    (meta.user_id as string) ||
    (meta.firebase_uid as string)
  if (metaUid) return metaUid

  // Priority 2: client_reference_id (supported via URL param on Payment Links/Checkout)
  if (session.client_reference_id) return session.client_reference_id

  // Priority 3: try finding a Firebase user by email
  const email =
    session.customer_details?.email ||
    (typeof session.customer === "string" ? undefined : (session.customer as Stripe.Customer | null)?.email)
  if (email) {
    try {
      const record = await auth.getUserByEmail(email)
      if (record?.uid) return record.uid
    } catch {
      // ignore
    }
  }

  return null
}

async function upsertMembership(uid: string, data: Record<string, any>) {
  const ref = db.collection("memberships").doc(uid)
  const now = Timestamp.fromDate(new Date())
  await ref.set(
    {
      uid,
      updatedAt: now,
      createdAt: now,
      ...data,
    },
    { merge: true },
  )
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: Stripe.Event
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  try {
    event = stripe.webhooks.constructEvent(body, signature as string, webhookSecret)
  } catch (err: any) {
    console.error("❌ Webhook verification failed:", err.message)
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const uid = await findUidFromSession(session)

        if (!uid) {
          console.error("❌ Could not find user ID on checkout.session.completed", {
            sessionId: session.id,
          })
          return NextResponse.json({ error: "Could not find user ID" }, { status: 400 })
        }

        // If it's a subscription payment link, session.subscription should be present
        let status: ProStatus = "active"
        let currentPeriodEnd: Date | undefined
        let stripeSubscriptionId: string | undefined

        if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          status = mapSubscriptionStatus(sub.status)
          currentPeriodEnd = new Date(sub.current_period_end * 1000)
          stripeSubscriptionId = sub.id
        }

        await upsertMembership(uid, {
          plan: "creator_pro",
          status,
          isActive: status === "active" || status === "trialing",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripeSubscriptionId,
          currentPeriodEnd: currentPeriodEnd ? Timestamp.fromDate(currentPeriodEnd) : null,
          priceId:
            session.mode === "subscription"
              ? (session.subscription_items?.[0]?.price?.id ??
                (session.line_items as any)?.data?.[0]?.price?.id ??
                null)
              : ((session.line_items as any)?.data?.[0]?.price?.id ?? null),
          features: proFeatures(),
        })

        console.log("✅ Membership upgraded via checkout.session.completed", {
          uid,
          sessionId: session.id,
          mode: session.mode,
        })
        return NextResponse.json({ received: true })
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription

        // Try to get uid from subscription metadata or client_reference_id on the latest invoice/checkout
        let uid =
          (sub.metadata?.buyerUid as string) ||
          (sub.metadata?.uid as string) ||
          (sub.metadata?.userId as string) ||
          null

        if (!uid) {
          // Try from the latest checkout session if available
          const latestInvoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id
          if (latestInvoiceId) {
            try {
              const invoice = await stripe.invoices.retrieve(latestInvoiceId, { expand: ["payment_intent"] })
              const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | null
              const checkoutSessionId = typeof paymentIntent?.latest_charge === "string" ? undefined : undefined // no reliable hop; skip
              // fallback to customer email lookup
            } catch {
              // ignore
            }
          }

          // Fallback by customer email
          if (typeof sub.customer === "string") {
            const cust = await stripe.customers.retrieve(sub.customer)
            const email = (cust as Stripe.Customer).email
            if (email) {
              try {
                const record = await auth.getUserByEmail(email)
                uid = record.uid
              } catch {
                // ignore
              }
            }
          }
        }

        if (!uid) {
          console.warn("⚠️ Subscription event without resolvable uid; skipping membership upsert", {
            subId: sub.id,
          })
          return NextResponse.json({ received: true })
        }

        const status = mapSubscriptionStatus(sub.status)
        const currentPeriodEnd = new Date(sub.current_period_end * 1000)

        await upsertMembership(uid, {
          plan: status === "canceled" ? "free" : "creator_pro",
          status,
          isActive: status === "active" || status === "trialing",
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: Timestamp.fromDate(currentPeriodEnd),
          priceId: sub.items?.data?.[0]?.price?.id ?? null,
          features: status === "canceled" ? undefined : proFeatures(),
        })

        console.log("✅ Membership synced from subscription event", { uid, subId: sub.id, status })
        return NextResponse.json({ received: true })
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription

        // Try to resolve user
        let uid =
          (sub.metadata?.buyerUid as string) ||
          (sub.metadata?.uid as string) ||
          (sub.metadata?.userId as string) ||
          null

        if (!uid && typeof sub.customer === "string") {
          const cust = await stripe.customers.retrieve(sub.customer)
          const email = (cust as Stripe.Customer).email
          if (email) {
            try {
              const record = await auth.getUserByEmail(email)
              uid = record.uid
            } catch {
              // ignore
            }
          }
        }

        if (!uid) {
          console.warn("⚠️ Subscription deleted without resolvable uid; skipping downgrade", { subId: sub.id })
          return NextResponse.json({ received: true })
        }

        await upsertMembership(uid, {
          plan: "free",
          status: "canceled",
          isActive: false,
          stripeSubscriptionId: sub.id,
        })

        console.log("✅ Membership downgraded from subscription.deleted", { uid, subId: sub.id })
        return NextResponse.json({ received: true })
      }

      default: {
        // Ignore other events
        return NextResponse.json({ received: true })
      }
    }
  } catch (error: any) {
    console.error("❌ Webhook processing failed:", error)
    return NextResponse.json({ error: error.message ?? "Webhook processing failed" }, { status: 500 })
  }
}
