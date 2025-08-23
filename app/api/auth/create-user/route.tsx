import { type NextRequest, NextResponse } from "next/server"
import { ensureMembership } from "@/lib/memberships-service"
import { createFreeUser } from "@/lib/free-users-service"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Server-side user creation API called")

    const { uid, email, username, displayName } = await request.json()

    if (!uid || !email) {
      console.error("❌ Missing required fields:", { uid: !!uid, email: !!email })
      return NextResponse.json({ error: "Missing required fields: uid and email" }, { status: 400 })
    }

    console.log("🔄 Creating user records for:", {
      uid: uid.substring(0, 8) + "...",
      email,
      username,
      displayName,
    })

    // Create freeUsers record first (this is what tracks free tier limitations)
    try {
      console.log("🔄 Creating freeUsers record...")
      const freeUser = await createFreeUser(uid, email)
      console.log("✅ FreeUsers record created successfully:", {
        uid: freeUser.uid,
        email: freeUser.email,
        downloadsUsed: freeUser.downloadsUsed,
        bundlesCreated: freeUser.bundlesCreated,
      })
    } catch (error) {
      console.error("❌ Failed to create freeUsers record:", error)
      return NextResponse.json(
        {
          error: "Failed to create freeUsers record",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      )
    }

    // Also create membership record for consistency
    try {
      console.log("🔄 Creating membership record...")
      const membership = await ensureMembership(uid, email)
      console.log("✅ Membership record created/ensured:", {
        uid: membership.uid,
        plan: membership.plan,
        status: membership.status,
      })
    } catch (error) {
      console.error("❌ Failed to create membership record:", error)
      // Don't fail the entire request if membership fails, since freeUsers is the primary tracker
      console.warn("⚠️ Continuing despite membership error since freeUsers was created successfully")
    }

    try {
      console.log("📧 Adding user to Resend contacts...")

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

        console.log("✅ User added to Resend contacts:", {
          email,
          name: contactName,
          contactId: result.data?.id,
        })

        // Send welcome email after successful contact creation
        try {
          console.log("📧 Sending welcome email...")

          const welcomeEmailResult = await resend.emails.send({
            from: "MassClip <contact@massclip.pro>",
            to: email,
            subject: "Welcome to MassClip 💸",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                  <h2 style="font-size: 24px; color: #222;">Welcome to MassClip 💸</h2>

                  <p style="font-size: 16px; color: #444; margin-top: 20px;">
                    We're glad to have you on board. Ready to take selling your content seriously?
                  </p>

                  <p style="font-size: 16px; color: #444;">
                    MassClip is a platform that allows creators like you to sell and monetize your creative content in a branded, tailored, professional way. 
                    No janky files, just a clean interface to showcase your content in a <strong>SERIOUS</strong> way.
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://massclip.pro/" style="display: inline-block; padding: 14px 28px; background-color: #7A5AF8; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px;">
                      Set up your storefront now →
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #999; margin-top: 40px;">
                    Let's get to it. The game just changed.
                  </p>
                </div>
              </div>
            `,
          })

          console.log("✅ Welcome email sent successfully:", {
            email,
            emailId: welcomeEmailResult.data?.id,
          })
        } catch (emailError) {
          console.error("❌ Failed to send welcome email:", emailError)
          // Don't fail the entire request if welcome email fails
          console.warn("⚠️ Continuing despite welcome email error since user creation was successful")
        }
      }
    } catch (error) {
      console.error("❌ Failed to add user to Resend contacts:", error)
      // Don't fail the entire request if Resend fails
      console.warn("⚠️ Continuing despite Resend error since core user creation was successful")
    }

    console.log("✅ Server-side user creation completed successfully")

    return NextResponse.json({
      success: true,
      message: "User records created successfully",
      uid,
      email,
    })
  } catch (error: any) {
    console.error("❌ Server-side user creation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create user records",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
