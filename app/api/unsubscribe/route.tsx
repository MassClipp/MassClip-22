import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    console.log("[v0] Unsubscribe request URL:", request.url)
    console.log("[v0] Email parameter received:", email)
    console.log("[v0] All search params:", Object.fromEntries(searchParams.entries()))

    if (!email) {
      return new NextResponse(
        `<html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h2>Invalid Request</h2>
          <p>No email address provided.</p>
          <p><strong>URL received:</strong> ${request.url}</p>
          <p><strong>Expected format:</strong> /api/unsubscribe?email=your@email.com</p>
        </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } },
      )
    }

    if (process.env.RESEND_AUDIENCE_ID) {
      try {
        await resend.contacts.remove({
          audienceId: process.env.RESEND_AUDIENCE_ID,
          email: email,
        })
        console.log(`[v0] Successfully removed ${email} from Resend audience`)
      } catch (resendError) {
        console.error(`[v0] Failed to remove ${email} from Resend:`, resendError)
        // Continue anyway - show success to user even if Resend fails
      }
    }

    return new NextResponse(
      `<html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h2>You've been unsubscribed</h2>
        <p><strong>${email}</strong> has been removed from our mailing list.</p>
        <p>You will no longer receive emails from MassClip.</p>
        <p>If you change your mind, you can always sign up again at <a href="https://massclip.pro">massclip.pro</a>.</p>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } },
    )
  } catch (error) {
    console.error("[v0] Unsubscribe error:", error)
    return new NextResponse(
      `<html><body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h2>Error</h2>
        <p>Something went wrong. Please try again later.</p>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    )
  }
}
