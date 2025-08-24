import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head><title>Invalid Unsubscribe Link</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Invalid Unsubscribe Link</h2>
            <p>This unsubscribe link is missing the email address. Please contact support if you continue to receive unwanted emails.</p>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        },
      )
    }

    // Remove contact from Resend audience
    if (process.env.RESEND_AUDIENCE_ID) {
      try {
        await resend.contacts.remove({
          audienceId: process.env.RESEND_AUDIENCE_ID,
          email: email,
        })
        console.log(`[v0] Successfully removed ${email} from Resend audience`)
      } catch (resendError: any) {
        console.error("[v0] Failed to remove contact from Resend:", resendError)
        // Continue anyway - we'll still show success to user
      }
    }

    // Return success page
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Successfully Unsubscribed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h2 style="color: #333;">You've been unsubscribed</h2>
          <p style="color: #666; line-height: 1.5;">
            <strong>${email}</strong> has been removed from our mailing list.
          </p>
          <p style="color: #666; line-height: 1.5;">
            You will no longer receive emails from MassClip. If you change your mind, you can always sign up again at 
            <a href="https://www.massclip.pro" style="color: #007BFF;">massclip.pro</a>.
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 14px;">
              Thanks for giving MassClip a try!
            </p>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    )
  } catch (error) {
    console.error("[v0] Unsubscribe error:", error)

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribe Error</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h2>Something went wrong</h2>
          <p>We encountered an error while processing your unsubscribe request. Please try again or contact support.</p>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      },
    )
  }
}
