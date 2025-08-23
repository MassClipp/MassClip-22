import { type NextRequest, NextResponse } from "next/server"
import { getAdminAuth } from "@/lib/firebase-admin"
import { Resend } from "resend"

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// You'll need to set this environment variable with your Resend audience ID
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
    }

    if (!RESEND_AUDIENCE_ID) {
      return NextResponse.json({ error: "RESEND_AUDIENCE_ID not configured" }, { status: 500 })
    }

    console.log("🔄 Starting Firebase users sync to Resend...")

    const auth = getAdminAuth()
    let nextPageToken: string | undefined = undefined
    let totalProcessed = 0
    let totalSynced = 0
    let totalErrors = 0

    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken)
      const users = listUsersResult.users

      console.log(`📊 Processing batch of ${users.length} users...`)

      for (const user of users) {
        totalProcessed++

        try {
          // Skip users without email
          if (!user.email) {
            console.log(`⏭️  Skipping user ${user.uid} - no email`)
            continue
          }

          // Prepare contact data
          const contactData = {
            email: user.email,
            first_name: user.displayName || user.email.split("@")[0], // Use display name or email prefix
            unsubscribed: false,
          }

          const response = await resend.contacts.create({
            audience_id: RESEND_AUDIENCE_ID,
            email: contactData.email,
            first_name: contactData.first_name,
            unsubscribed: contactData.unsubscribed,
          })

          if (response.error) {
            // Handle duplicate contacts gracefully
            if (response.error.message?.includes("already exists")) {
              await resend.contacts.update({
                audience_id: RESEND_AUDIENCE_ID,
                id: response.error.id || user.email, // Use email as fallback ID
                email: contactData.email,
                first_name: contactData.first_name,
                unsubscribed: contactData.unsubscribed,
              })
              console.log(`🔄 Updated existing contact: ${user.email}`)
            } else {
              throw new Error(response.error.message)
            }
          } else {
            console.log(`✅ Added new contact: ${user.email}`)
          }

          totalSynced++

          if (totalProcessed % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        } catch (error: any) {
          totalErrors++
          console.error(`❌ Error syncing user ${user.email}:`, error.message)
        }
      }

      nextPageToken = listUsersResult.pageToken
      console.log(`📈 Progress: ${totalProcessed} processed, ${totalSynced} synced, ${totalErrors} errors`)
    } while (nextPageToken)

    console.log("🎉 Firebase users sync to Resend completed!")

    return NextResponse.json({
      success: true,
      message: "Users successfully synced to Resend",
      stats: {
        totalProcessed,
        totalSynced,
        totalErrors,
      },
    })
  } catch (error: any) {
    console.error("❌ Error syncing users to Resend:", error)
    return NextResponse.json(
      {
        error: "Failed to sync users to Resend",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Firebase to Resend User Sync Script",
    instructions: [
      "This is a one-time manual script to backfill existing Firebase users to Resend contacts",
      "Make sure RESEND_API_KEY and RESEND_AUDIENCE_ID are set in environment variables",
      "Send a POST request to this endpoint to start the sync process",
      "Monitor the server logs for detailed progress information",
    ],
    requiredEnvVars: ["RESEND_API_KEY", "RESEND_AUDIENCE_ID"],
  })
}
