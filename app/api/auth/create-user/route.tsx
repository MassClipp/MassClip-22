import { type NextRequest, NextResponse } from "next/server"
import { ensureMembership } from "@/lib/memberships-service"
import { createFreeUser } from "@/lib/free-users-service"
import { Resend } from "resend"
import { DripCampaignService } from "@/lib/drip-campaign-service"
import { BehavioralEmailService } from "@/lib/behavioral-email-service"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Server-side user creation API called")

    const { uid, email, username, displayName } = await request.json()

    if (!uid || !email) {
      console.error("[v0] Missing required fields:", { uid: !!uid, email: !!email })
      return NextResponse.json({ error: "Missing required fields: uid and email" }, { status: 400 })
    }

    console.log("[v0] Creating user records for:", {
      uid: uid.substring(0, 8) + "...",
      email,
      username,
      displayName,
    })

    let isNewUser = false

    // Create freeUsers record first (this is what tracks free tier limitations)
    try {
      console.log("[v0] Creating freeUsers record...")
      const freeUser = await createFreeUser(uid, email)
      isNewUser = true
      console.log("[v0] FreeUsers record created successfully - NEW USER:", {
        uid: freeUser.uid,
        email: freeUser.email,
        downloadsUsed: freeUser.downloadsUsed,
        bundlesCreated: freeUser.bundlesCreated,
      })
    } catch (error) {
      console.error("[v0] Failed to create freeUsers record:", error)
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log("[v0] User already exists - RETURNING USER")
        isNewUser = false
      } else {
        return NextResponse.json(
          {
            error: "Failed to create freeUsers record",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 },
        )
      }
    }

    // Also create membership record for consistency
    try {
      console.log("[v0] Creating membership record...")
      const membership = await ensureMembership(uid, email)
      if (membership) {
        console.log("[v0] Membership record created/ensured:", {
          uid: membership.uid,
          plan: membership.plan,
          status: membership.status,
        })
      } else {
        console.warn("[v0] ensureMembership returned null - membership may not have been created")
      }
    } catch (error) {
      console.error("[v0] Failed to create membership record:", error)
      // Don't fail the entire request if membership fails, since freeUsers is the primary tracker
      console.warn("⚠️ Continuing despite membership error since freeUsers was created successfully")
    }

    try {
      console.log("[v0] Adding user to Resend contacts...")

      if (!process.env.RESEND_AUDIENCE_ID) {
        console.warn("⚠️ RESEND_AUDIENCE_ID not configured, skipping contact creation")
      } else {
        const contactName = displayName || username || email.split("@")[0]

        const result = await resend.contacts.create({
          email: email,
          firstName: contactName,
          audienceId: process.env.RESEND_AUDIENCE_ID,
          unsubscribed: false,
        })

        console.log("[v0] User added to Resend contacts:", {
          email,
          name: contactName,
          contactId: result.data?.id,
        })

        // Welcome email disabled - all automated emails turned off
        /*
        try {
          console.log("[v0] Sending welcome email...")

          const welcomeEmailResult = await resend.emails.send({
            from: "MassClip <contact@massclip.pro>",
            to: email,
            subject: "Your Content is Worth More Than You Think 💰",
            html: `
              <!DOCTYPE html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <title>Welcome to MassClip</title>
                </head>
                <body style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #000;">
                  <p>Hey ${displayName || username || "there"},</p>
                  
                  <p>Welcome to MassClip. You just took the first step toward turning your faceless content into a real income stream.</p>
                  
                  <p>Here's the truth: your audience is already waiting to pay for your content. They want the value you create, the insights you share, and the work you put in. The only thing standing between you and passive income is getting your content in front of them the right way.</p>
                  
                  <p>That's exactly what MassClip does. We help you organize, bundle, and sell your content so you can start earning while you sleep. No complicated setup. No endless manual work. Just upload your content, let our AI handle the rest, and watch the sales come in.</p>
                  
                  <p><strong>Your content has value. It's time to get paid for it.</strong></p>
                  
                  <p>Over the next few days, we'll walk you through exactly how to set everything up so you can start earning as quickly as possible. But if you're ready to dive in right now, here's what to do:</p>
                  
                  <ol style="line-height: 1.8;">
                    <li>Upload your first piece of content</li>
                    <li>Let Vex AI organize and bundle it for you</li>
                    <li>Connect your payment account</li>
                    <li>Start earning passive income</li>
                  </ol>
                  
                  <p><a href="https://www.massclip.pro/dashboard" style="display: inline-block; background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Get Started Now</a></p>
                  
                  <p>Are you ready to let your content pay you in your sleep?</p>
                  
                  <p>Let's make it happen.</p>
                  
                  <p>Best,<br>The MassClip Team</p>
                  
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    If you no longer want to receive emails from MassClip, you can 
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.massclip.pro"}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999;">unsubscribe here</a>.
                  </p>
                </body>
              </html>
            `,
          })

          console.log("[v0] Welcome email sent successfully:", {
            email,
            emailId: welcomeEmailResult.data?.id,
          })
        } catch (emailError) {
          console.error("[v0] Failed to send welcome email:", emailError)
          // Don't fail the entire request if welcome email fails
          console.warn("⚠️ Continuing despite welcome email error since user creation was successful")
        }
        */
      }
    } catch (error) {
      console.error("[v0] Failed to add user to Resend contacts:", error)
      // Don't fail the entire request if Resend fails
      console.warn("⚠️ Continuing despite Resend error since core user creation was successful")
    }

    // Drip campaign and behavioral email initialization disabled - all automated emails turned off
    /*
    try {
      console.log("[v0] Initializing drip campaign...")
      await DripCampaignService.initializeCampaign(uid, email, displayName)
      console.log("[v0] Drip campaign initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize drip campaign:", error)
      // Don't fail the entire request if drip campaign fails
      console.warn("⚠️ Continuing despite drip campaign error since user creation was successful")
    }

    try {
      console.log("[v0] Initializing behavioral emails...")
      await BehavioralEmailService.initializeBehavioralEmails(uid, email, displayName)
      console.log("[v0] Behavioral emails initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize behavioral emails:", error)
      // Don't fail the entire request if behavioral emails fail
      console.warn("⚠️ Continuing despite behavioral email error since user creation was successful")
    }
    */

    console.log("[v0] Server-side user creation completed successfully, isNewUser:", isNewUser)

    return NextResponse.json({
      success: true,
      message: "User records created successfully",
      uid,
      email,
      isNewUser,
    })
  } catch (error: any) {
    console.error("[v0] Server-side user creation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create user records",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
