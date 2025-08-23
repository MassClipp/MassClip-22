import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createHmac } from "crypto" // Using built-in Node.js crypto module

const resend = new Resend(process.env.RESEND_API_KEY)

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false

  const expectedSignature = createHmac("sha256", secret).update(payload).digest("hex")

  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get("resend-signature")

    // Verify webhook signature
    if (!verifySignature(body, signature || "", process.env.RESEND_WEBHOOK_SECRET || "")) {
      console.log("❌ Invalid webhook signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the verified payload
    const event = JSON.parse(body)
    console.log("✅ Resend webhook received:", event.type)

    // Handle contact.created events
    if (event.type === "contact.created") {
      const contact = event.data
      console.log("👤 New contact created:", contact.email)

      // Send welcome email
      try {
        await resend.emails.send({
          from: "support@massclip.pro",
          to: contact.email,
          subject: "Welcome to MassClip - Start Selling Your Content",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #000; font-size: 28px; margin: 0;">Welcome to MassClip</h1>
                <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">We take selling content seriously. You should too.</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #000 0%, #333 100%); color: white; padding: 30px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin: 0 0 15px 0; font-size: 22px;">Ready to monetize your content?</h2>
                <p style="margin: 0 0 20px 0; line-height: 1.6;">Join thousands of creators who are building sustainable income streams with their content. Upload, price, and sell - it's that simple.</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="display: inline-block; background: white; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Creating →</a>
              </div>
              
              <div style="margin: 30px 0;">
                <h3 style="color: #000; margin: 0 0 15px 0;">What's next?</h3>
                <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                  <li>Connect your Stripe account for instant payouts</li>
                  <li>Upload your first piece of content</li>
                  <li>Set your prices and start earning</li>
                  <li>Build your audience with free content</li>
                </ul>
              </div>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #999; font-size: 14px;">
                <p>Questions? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_SITE_URL}/support" style="color: #000;">support center</a></p>
                <p>MassClip - Professional Content Monetization</p>
              </div>
            </div>
          `,
        })
        console.log("📧 Welcome email sent to:", contact.email)
      } catch (emailError) {
        console.error("❌ Failed to send welcome email:", emailError)
      }
    } else {
      console.log("📝 Webhook event logged:", event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
