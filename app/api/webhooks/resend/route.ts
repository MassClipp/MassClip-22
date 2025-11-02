import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"
import { createHmac, timingSafeEqual } from "node:crypto"

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error("Missing RESEND_WEBHOOK_SECRET")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Get the raw body and signature
    const body = await request.text()
    const signature = headers().get("resend-signature") || headers().get("Resend-Signature")

    if (!signature) {
      console.error("Missing Resend signature header")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    // Verify webhook signature
    const expectedSignature = createHmac("sha256", webhookSecret).update(body).digest("hex")

    const providedSignature = signature.replace("sha256=", "")

    if (!timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
      console.error("Invalid Resend webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the webhook payload
    const event = JSON.parse(body)
    console.log(`✅ [Resend Webhook] Received event: ${event.type}`)

    // Store raw event for diagnostics
    try {
      await adminDb.collection("resendWebhookEvents").add({
        eventType: event.type,
        eventId: event.data?.email_id || event.id,
        receivedAt: new Date(),
        rawEvent: event,
      })
    } catch (error) {
      console.warn("Failed to store raw Resend event:", error)
    }

    // Process different event types
    switch (event.type) {
      case "email.sent":
        await handleEmailSent(event.data)
        break
      case "email.delivered":
        await handleEmailDelivered(event.data)
        break
      case "email.delivery_delayed":
        await handleEmailDelayed(event.data)
        break
      case "email.complained":
        await handleEmailComplained(event.data)
        break
      case "email.bounced":
        await handleEmailBounced(event.data)
        break
      case "email.opened":
        await handleEmailOpened(event.data)
        break
      case "email.clicked":
        await handleEmailClicked(event.data)
        break
      default:
        console.log(`Unhandled Resend event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Resend webhook error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleEmailSent(data: any) {
  console.log(`📧 [Resend] Email sent: ${data.email_id} to ${data.to}`)

  await adminDb.collection("emailEvents").add({
    type: "sent",
    emailId: data.email_id,
    to: data.to,
    from: data.from,
    subject: data.subject,
    timestamp: new Date(),
    data: data,
  })
}

async function handleEmailDelivered(data: any) {
  console.log(`✅ [Resend] Email delivered: ${data.email_id} to ${data.to}`)

  await adminDb.collection("emailEvents").add({
    type: "delivered",
    emailId: data.email_id,
    to: data.to,
    timestamp: new Date(),
    data: data,
  })
}

async function handleEmailDelayed(data: any) {
  console.log(`⏰ [Resend] Email delayed: ${data.email_id} to ${data.to}`)

  await adminDb.collection("emailEvents").add({
    type: "delayed",
    emailId: data.email_id,
    to: data.to,
    timestamp: new Date(),
    data: data,
  })
}

async function handleEmailComplained(data: any) {
  console.log(`⚠️ [Resend] Email complained: ${data.email_id} from ${data.to}`)

  // Mark user as complained to avoid future emails
  try {
    const userQuery = await adminDb.collection("users").where("email", "==", data.to).get()
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0]
      await userDoc.ref.update({
        emailComplained: true,
        emailComplainedAt: new Date(),
      })
    }
  } catch (error) {
    console.error("Failed to update user complaint status:", error)
  }

  await adminDb.collection("emailEvents").add({
    type: "complained",
    emailId: data.email_id,
    to: data.to,
    timestamp: new Date(),
    data: data,
  })
}

async function handleEmailBounced(data: any) {
  console.log(`❌ [Resend] Email bounced: ${data.email_id} to ${data.to}`)

  // Mark user email as bounced to avoid future sends
  try {
    const userQuery = await adminDb.collection("users").where("email", "==", data.to).get()
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0]
      await userDoc.ref.update({
        emailBounced: true,
        emailBouncedAt: new Date(),
        bounceType: data.bounce_type,
      })
    }
  } catch (error) {
    console.error("Failed to update user bounce status:", error)
  }

  await adminDb.collection("emailEvents").add({
    type: "bounced",
    emailId: data.email_id,
    to: data.to,
    bounceType: data.bounce_type,
    timestamp: new Date(),
    data: data,
  })
}

async function handleEmailOpened(data: any) {
  console.log(`👀 [Resend] Email opened: ${data.email_id} by ${data.to}`)

  await adminDb.collection("emailEvents").add({
    type: "opened",
    emailId: data.email_id,
    to: data.to,
    timestamp: new Date(),
    data: data,
  })
}

async function handleEmailClicked(data: any) {
  console.log(`🔗 [Resend] Email clicked: ${data.email_id} by ${data.to}`)

  await adminDb.collection("emailEvents").add({
    type: "clicked",
    emailId: data.email_id,
    to: data.to,
    link: data.link,
    timestamp: new Date(),
    data: data,
  })
}
