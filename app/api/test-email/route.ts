import { NextResponse } from "next/server"
import { Resend } from "resend"

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    console.log("Testing Resend API")

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("Resend API key is not configured")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    // Send a test email
    const { data, error } = await resend.emails.send({
      from: "support@massclip.pro",
      to: "test@example.com", // Replace with your email for testing
      subject: "Test Email",
      html: "<p>This is a test email to verify the Resend API is working.</p>",
    })

    if (error) {
      console.error("Resend API error:", error)
      return NextResponse.json({ error: "Failed to send test email", details: error }, { status: 500 })
    }

    console.log("Test email sent successfully")
    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      data,
    })
  } catch (error: any) {
    console.error("Unexpected error in test email:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
