import { type NextRequest, NextResponse } from "next/server"
import { createHash, createHmac } from "crypto"
import { Resend } from "resend"

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Welcome email template
const createWelcomeEmailTemplate = (email: string, firstName?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to MassClip</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo img {
      max-width: 150px;
    }
    h1 {
      color: #e11d48;
      margin-top: 0;
      text-align: center;
      font-size: 28px;
    }
    .welcome-message {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
      border-left: 4px solid #e11d48;
    }
    .button {
      display: inline-block;
      background-color: #e11d48;
      color: white;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      margin: 24px 0;
      font-weight: 600;
      text-align: center;
    }
    .features {
      margin: 32px 0;
    }
    .feature {
      margin: 16px 0;
      padding: 12px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .feature:last-child {
      border-bottom: none;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 14px;
      color: #666;
      border-top: 1px solid #e9ecef;
      padding-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://massclip.pro/logo.png" alt="MassClip Logo" />
    </div>
    
    <h1>Welcome to MassClip!</h1>
    
    <div class="welcome-message">
      <p><strong>Hey ${firstName || "there"}!</strong></p>
      <p>Welcome to MassClip - where we take selling content seriously. You should too.</p>
    </div>
    
    <p>You've just joined a platform designed for creators who are serious about monetizing their content. Here's what you can do:</p>
    
    <div class="features">
      <div class="feature">
        <strong>🎬 Upload & Sell Videos</strong><br>
        Share your premium video content and get paid directly
      </div>
      <div class="feature">
        <strong>🎵 Audio Content</strong><br>
        Sell music, podcasts, sound effects, and more
      </div>
      <div class="feature">
        <strong>🖼️ Image Collections</strong><br>
        Monetize your photography and digital art
      </div>
      <div class="feature">
        <strong>📦 Create Bundles</strong><br>
        Package multiple pieces of content for higher value sales
      </div>
    </div>
    
    <p style="text-align: center;">
      <a href="https://massclip.pro/dashboard" class="button">Start Creating</a>
    </p>
    
    <p>Ready to turn your creativity into income? Your audience is waiting.</p>
    
    <p>Best regards,<br>The MassClip Team</p>
  </div>
  
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} MassClip. All rights reserved.</p>
    <p>MassClip: Sell Your Content Seriously</p>
  </div>
</body>
</html>
`

// Verify webhook signature
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = createHmac("sha256", secret).update(body, "utf8").digest("hex")

    // Resend sends signature in format: sha256=<hash>
    const receivedSignature = signature.replace("sha256=", "")

    return (
      createHash("sha256").update(expectedSignature).digest("hex") ===
      createHash("sha256").update(receivedSignature).digest("hex")
    )
  } catch (error) {
    console.error("Error verifying webhook signature:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify content type
    const contentType = request.headers.get("content-type")
    if (contentType !== "application/json") {
      console.error("Invalid content type:", contentType)
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }

    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get("x-resend-signature")

    // Verify webhook secret is configured
    if (!process.env.RESEND_WEBHOOK_SECRET) {
      console.error("RESEND_WEBHOOK_SECRET not configured")
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    // Verify signature
    if (!signature) {
      console.error("Missing webhook signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    if (!verifyWebhookSignature(body, signature, process.env.RESEND_WEBHOOK_SECRET)) {
      console.error("Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the verified body
    const event = JSON.parse(body)

    console.log("📧 Resend webhook received:", {
      type: event.type,
      timestamp: new Date().toISOString(),
      eventId: event.id || "unknown",
    })

    // Handle different event types
    switch (event.type) {
      case "contact.created":
        try {
          const contact = event.data
          console.log("👤 New contact created:", {
            email: contact.email,
            firstName: contact.first_name,
            timestamp: new Date().toISOString(),
          })

          // Send welcome email
          if (contact.email) {
            const { data, error } = await resend.emails.send({
              from: "support@massclip.pro",
              to: contact.email,
              subject: "Welcome to MassClip - Let's Get You Started!",
              html: createWelcomeEmailTemplate(contact.email, contact.first_name),
            })

            if (error) {
              console.error("❌ Failed to send welcome email:", error)
            } else {
              console.log("✅ Welcome email sent successfully:", {
                email: contact.email,
                emailId: data?.id,
              })
            }
          }

          // Log for analytics/monitoring
          console.log("📊 Contact onboarding completed for:", contact.email)
        } catch (error) {
          console.error("❌ Error handling contact.created event:", error)
        }
        break

      case "email.opened":
        console.log("📖 Email opened:", {
          email: event.data?.email,
          subject: event.data?.subject,
          timestamp: new Date().toISOString(),
        })
        break

      case "email.clicked":
        console.log("🖱️ Email clicked:", {
          email: event.data?.email,
          url: event.data?.url,
          timestamp: new Date().toISOString(),
        })
        break

      case "email.delivered":
        console.log("📬 Email delivered:", {
          email: event.data?.email,
          subject: event.data?.subject,
          timestamp: new Date().toISOString(),
        })
        break

      case "email.bounced":
        console.log("⚠️ Email bounced:", {
          email: event.data?.email,
          reason: event.data?.reason,
          timestamp: new Date().toISOString(),
        })
        break

      default:
        console.log("📝 Unhandled event type:", event.type)
        break
    }

    // Return success for all verified events
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      eventType: event.type,
    })
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
