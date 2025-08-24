import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { adminDb } from "@/lib/firebase-admin"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email parameter is required" }, { status: 400 })
    }

    if (!process.env.RESEND_AUDIENCE_ID) {
      return NextResponse.json({ error: "RESEND_AUDIENCE_ID not configured" }, { status: 500 })
    }

    console.log(`🔄 Processing unsubscribe request for: ${email}`)

    try {
      // Remove contact from Resend audience
      await resend.contacts.remove({
        audienceId: process.env.RESEND_AUDIENCE_ID,
        email: email,
      })

      console.log(`✅ Successfully removed ${email} from Resend contacts`)

      // Log the unsubscribe event in Firebase
      await adminDb.collection("emailEvents").add({
        type: "unsubscribed",
        email: email,
        timestamp: new Date(),
        source: "unsubscribe_link",
      })

      // Update user record if exists
      try {
        const userQuery = await adminDb.collection("users").where("email", "==", email).get()
        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0]
          await userDoc.ref.update({
            emailUnsubscribed: true,
            emailUnsubscribedAt: new Date(),
          })
          console.log(`✅ Updated user record for ${email}`)
        }
      } catch (error) {
        console.warn("Failed to update user record:", error)
      }

      // Return a simple HTML page confirming unsubscribe
      return new Response(
        `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Unsubscribed - MassClip</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px; 
                text-align: center; 
                line-height: 1.6;
              }
              .container { 
                background: #f9f9f9; 
                padding: 40px; 
                border-radius: 8px; 
                border: 1px solid #ddd; 
              }
              h1 { color: #333; }
              p { color: #666; }
              .email { font-weight: bold; color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>You've been unsubscribed</h1>
              <p>The email address <span class="email">${email}</span> has been successfully removed from our mailing list.</p>
              <p>You will no longer receive marketing emails from MassClip.</p>
              <p>If you change your mind, you can always sign up again at <a href="https://www.massclip.pro">massclip.pro</a></p>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        },
      )
    } catch (resendError: any) {
      console.error(`❌ Failed to remove ${email} from Resend:`, resendError)

      // Still log the attempt even if Resend fails
      await adminDb.collection("emailEvents").add({
        type: "unsubscribe_failed",
        email: email,
        timestamp: new Date(),
        error: resendError.message,
        source: "unsubscribe_link",
      })

      return new Response(
        `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Unsubscribe Error - MassClip</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px; 
                text-align: center; 
                line-height: 1.6;
              }
              .container { 
                background: #fff5f5; 
                padding: 40px; 
                border-radius: 8px; 
                border: 1px solid #fed7d7; 
              }
              h1 { color: #e53e3e; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Unsubscribe Error</h1>
              <p>We encountered an issue processing your unsubscribe request.</p>
              <p>Please contact us directly at <a href="mailto:contact@massclip.pro">contact@massclip.pro</a> and we'll remove you manually.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 500,
          headers: {
            "Content-Type": "text/html",
          },
        },
      )
    }
  } catch (error: any) {
    console.error("❌ Unsubscribe endpoint error:", error)
    return NextResponse.json(
      {
        error: "Failed to process unsubscribe request",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
