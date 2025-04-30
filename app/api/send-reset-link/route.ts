import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { Resend } from "resend"

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Simplified email template for password reset
const createResetEmailTemplate = (resetLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your MassClip Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #e11d48; margin-top: 0;">Reset Your Password</h1>
    
    <p>Hello,</p>
    
    <p>We received a request to reset your password for your MassClip account. Click the link below to reset your password:</p>
    
    <p style="margin: 20px 0;">
      <a href="${resetLink}" style="display: inline-block; background-color: #e11d48; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 500;">Reset Password</a>
    </p>
    
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
    
    <p>This link will expire in 1 hour for security reasons.</p>
    
    <p>Best regards,<br>The MassClip Team</p>
  </div>
</body>
</html>
`

export async function POST(request: NextRequest) {
  console.log("Password reset request received")

  try {
    // Initialize Firebase Admin if not already initialized
    initializeFirebaseAdmin()
    console.log("Firebase Admin initialized")

    // Parse request body
    const body = await request.json().catch((e) => {
      console.error("Error parsing request body:", e)
      return {}
    })

    const { email } = body
    console.log("Email from request:", email ? "Valid email received" : "No email received")

    // Validate email
    if (!email || typeof email !== "string") {
      console.error("Invalid email format")
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("Resend API key is not configured")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    try {
      // Generate password reset link with Firebase Admin
      const auth = getAuth()
      console.log("Getting Firebase Auth instance")

      // Force the continueUrl to be the production domain
      const actionCodeSettings = {
        url: "https://massclip.pro/reset-password",
        handleCodeInApp: false,
      }

      console.log("Generating password reset link")
      const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings)
      console.log("Reset link generated successfully")

      // Ensure the link uses the production domain
      const productionResetLink = resetLink.replace("massclip.vercel.app", "massclip.pro")
      console.log("Reset link domain corrected")

      // Send email with Resend
      console.log("Sending email via Resend")
      const { data, error } = await resend.emails.send({
        from: "support@massclip.pro",
        to: email,
        subject: "Reset Your Password",
        html: createResetEmailTemplate(productionResetLink),
      })

      if (error) {
        console.error("Resend API error:", error)
        return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 })
      }

      console.log("Email sent successfully")
      return NextResponse.json({
        success: true,
        message: "Password reset link sent",
      })
    } catch (firebaseError: any) {
      console.error("Firebase error:", firebaseError)

      // Handle Firebase specific errors
      if (firebaseError.code === "auth/user-not-found") {
        // Don't reveal if user exists for security
        return NextResponse.json({
          success: true,
          message: "If an account exists, a password reset link has been sent",
        })
      }

      return NextResponse.json(
        {
          error: "Error generating reset link",
          details: firebaseError.message || "Unknown Firebase error",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Unexpected error in password reset flow:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
