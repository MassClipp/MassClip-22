import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { Resend } from "resend"

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email template for password reset
const createResetEmailTemplate = (resetLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset Your MassClip Password</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo img {
      max-width: 150px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #e11d48;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      background-color: #e11d48;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: 500;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://massclip.pro/logo.png" alt="MassClip Logo" />
    </div>
    
    <h1>Reset Your Password</h1>
    
    <p>Hello,</p>
    
    <p>We received a request to reset your password for your MassClip account. Click the button below to reset your password:</p>
    
    <p style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </p>
    
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
    
    <p>This link will expire in 1 hour for security reasons.</p>
    
    <p>Best regards,<br>The MassClip Team</p>
  </div>
  
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} MassClip. All rights reserved.</p>
    <p>MassClip Pro - Your Ultimate Clip Vault</p>
  </div>
</body>
</html>
`

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin if not already initialized
    initializeFirebaseAdmin()

    // Parse request body
    const { email } = await request.json()

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Generate password reset link with Firebase Admin
    const auth = getAuth()
    const resetLink = await auth.generatePasswordResetLink(email, {
      url: "https://massclip.pro/reset-password",
    })

    // Send email with Resend
    const { data, error } = await resend.emails.send({
      from: "support@massclip.pro",
      to: email,
      subject: "Reset Your Password",
      html: createResetEmailTemplate(resetLink),
    })

    if (error) {
      console.error("Error sending reset email:", error)
      return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 })
    }

    // Log success for monitoring (optional)
    console.log(`Password reset email sent to ${email}`)

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Password reset link sent",
    })
  } catch (error: any) {
    console.error("Error in password reset flow:", error)

    // Handle Firebase specific errors
    if (error.code === "auth/user-not-found") {
      // Don't reveal if user exists for security
      return NextResponse.json({
        success: true,
        message: "If an account exists, a password reset link has been sent",
      })
    }

    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
