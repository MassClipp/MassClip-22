import { NextResponse } from "next/server"
import Stripe from "stripe"

// Helper function to retry operations with exponential backoff
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, initialDelay = 300): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.log(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error)

      // Wait with exponential backoff before retrying
      const delay = initialDelay * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export async function POST(request: Request) {
  console.log("------------ APP ROUTER CHECKOUT SESSION START ------------")
  console.log("Request received at:", new Date().toISOString())

  // Check for required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing environment variable: STRIPE_SECRET_KEY")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe secret key" }, { status: 500 })
  }

  if (!process.env.STRIPE_PRICE_ID) {
    console.error("Missing environment variable: STRIPE_PRICE_ID")
    return NextResponse.json({ error: "Server configuration error: Missing Stripe price ID" }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.error("Missing environment variable: NEXT_PUBLIC_SITE_URL")
    return NextResponse.json({ error: "Server configuration error: Missing site URL" }, { status: 500 })
  }

  try {
    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })

    // Parse the request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    // Get the user email from the request body
    const { userId, userEmail, email, displayName } = body || {}

    // Try to get email from different possible properties
    const customerEmail = userEmail || email || body?.user?.email

    if (!customerEmail) {
      console.error("MISSING EMAIL - Request body:", JSON.stringify(body))
      return NextResponse.json({ error: "Missing email in request body" }, { status: 400 })
    }

    if (!userId) {
      console.warn("⚠️ WARNING: Missing userId in request body. Metadata will be incomplete.")
      console.warn("Request body:", JSON.stringify(body))
    }

    console.log(`Creating checkout session for email: ${customerEmail}`)
    console.log(`User ID for metadata: ${userId || "NOT PROVIDED"}`)
    console.log("Using price ID:", process.env.STRIPE_PRICE_ID)
    console.log("Success URL:", `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success`)
    console.log("Cancel URL:", `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel`)

    // ENHANCED: Create metadata object with explicit string values
    const metadata = {
      email: customerEmail.toString(),
      firebaseUid: userId ? userId.toString() : "",
      plan: "pro",
      timestamp: new Date().toISOString(),
      source: "app_checkout", // Add source for tracking
      displayName: displayName ? displayName.toString() : "",
      requestId: Math.random().toString(36).substring(2, 15), // Add unique request ID for tracking
    }

    console.log("METADATA BEING SENT TO STRIPE:", JSON.stringify(metadata, null, 2))

    // Create a customer first to ensure metadata is attached
    let customer
    try {
      // Check if customer already exists
      const customers = await retryOperation(() =>
        stripe.customers.list({
          email: customerEmail,
          limit: 1,
        }),
      )

      if (customers.data.length > 0) {
        customer = customers.data[0]
        console.log(`Found existing customer: ${customer.id}`)

        // Update customer with metadata - use retry for reliability
        customer = await retryOperation(() =>
          stripe.customers.update(customer.id, {
            metadata: metadata,
          }),
        )
        console.log(`Updated existing customer with metadata:`, JSON.stringify(customer.metadata, null, 2))
      } else {
        // Create new customer with metadata - use retry for reliability
        customer = await retryOperation(() =>
          stripe.customers.create({
            email: customerEmail,
            name: displayName || undefined,
            metadata: metadata,
          }),
        )
        console.log(`Created new customer: ${customer.id} with metadata:`, JSON.stringify(customer.metadata, null, 2))
      }
    } catch (customerError) {
      console.error("Error creating/updating customer:", customerError)
      // Continue without customer if there's an error
    }

    // Double-check that customer has metadata
    if (customer) {
      console.log("VERIFICATION - Customer metadata:", JSON.stringify(customer.metadata, null, 2))

      // If metadata is missing, try updating again
      if (!customer.metadata?.firebaseUid && userId) {
        try {
          console.log("Metadata missing, attempting to update customer again...")
          customer = await retryOperation(() =>
            stripe.customers.update(customer.id, {
              metadata: metadata,
            }),
          )
          console.log("Customer updated again with metadata:", JSON.stringify(customer.metadata, null, 2))
        } catch (retryError) {
          console.error("Error in retry update of customer metadata:", retryError)
        }
      }
    }

    // Create session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscription/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: metadata,
      // Add metadata to subscription_data to ensure it propagates to the subscription
      subscription_data: {
        metadata: metadata,
      },
      client_reference_id: userId || undefined, // Add client reference ID for additional tracking
    }

    // Use customer if we created/found one
    if (customer) {
      sessionParams.customer = customer.id
      console.log(`Using customer ID: ${customer.id} for checkout session`)
    } else {
      // Fall back to customer_email if we couldn't create a customer
      sessionParams.customer_email = customerEmail
      console.log(`Using customer_email: ${customerEmail} for checkout session`)
    }

    console.log("Session parameters:", JSON.stringify(sessionParams, null, 2))

    // Create the checkout session with retry for reliability
    const session = await retryOperation(() => stripe.checkout.sessions.create(sessionParams))

    console.log("Session created with ID:", session.id)
    console.log("DIAGNOSTIC - Session metadata received from Stripe:", JSON.stringify(session.metadata, null, 2))
    console.log("Session URL:", session.url)

    // DIAGNOSTIC: Verify the session was created with metadata
    const retrievedSession = await retryOperation(() =>
      stripe.checkout.sessions.retrieve(session.id, {
        expand: ["subscription", "customer"],
      }),
    )

    console.log("DIAGNOSTIC - Retrieved session metadata:", JSON.stringify(retrievedSession.metadata, null, 2))

    if (retrievedSession.subscription) {
      console.log(
        "DIAGNOSTIC - Subscription metadata:",
        typeof retrievedSession.subscription === "string"
          ? "Subscription not expanded"
          : JSON.stringify(retrievedSession.subscription.metadata, null, 2),
      )
    }

    if (retrievedSession.customer) {
      console.log(
        "DIAGNOSTIC - Customer metadata:",
        typeof retrievedSession.customer === "string"
          ? "Customer not expanded"
          : JSON.stringify(retrievedSession.customer.metadata, null, 2),
      )
    }

    // Create a log entry in Firestore for debugging
    try {
      const { getFirestore } = await import("firebase-admin/firestore")
      const { initializeFirebaseAdmin } = await import("@/lib/firebase-admin")

      initializeFirebaseAdmin()
      const db = getFirestore()

      await db.collection("stripeCheckoutLogs").add({
        timestamp: new Date(),
        userId: userId || null,
        email: customerEmail,
        sessionId: session.id,
        customerId: customer?.id || null,
        requestMetadata: metadata,
        sessionMetadata: session.metadata || null,
        customerMetadata: customer?.metadata || null,
        success: true,
      })

      console.log("Created checkout log entry in Firestore")
    } catch (logError) {
      console.error("Error creating log entry:", logError)
      // Continue even if logging fails
    }

    console.log("------------ APP ROUTER CHECKOUT SESSION END ------------")

    // Return the session URL
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe session error:", error)
    console.error("Error message:", error instanceof Error ? error.message : "Unknown error")

    // Try to log the error to Firestore
    try {
      const { getFirestore } = await import("firebase-admin/firestore")
      const { initializeFirebaseAdmin } = await import("@/lib/firebase-admin")

      initializeFirebaseAdmin()
      const db = getFirestore()

      await db.collection("stripeCheckoutErrors").add({
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : null,
        requestBody: request.body ? await request.clone().text() : null,
      })

      console.log("Created error log entry in Firestore")
    } catch (logError) {
      console.error("Error creating error log entry:", logError)
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? `Stripe checkout error: ${error.message}` : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}
