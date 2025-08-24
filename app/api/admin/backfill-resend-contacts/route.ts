import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { auth } from "@/lib/firebase-admin"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Starting Resend contacts backfill...")

    if (!process.env.RESEND_AUDIENCE_ID) {
      return NextResponse.json({ error: "RESEND_AUDIENCE_ID not configured" }, { status: 500 })
    }

    let totalUsers = 0
    let successCount = 0
    let errorCount = 0
    let nextPageToken: string | undefined

    // Process users in batches
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken)

      for (const user of listUsersResult.users) {
        if (!user.email) continue

        totalUsers++

        try {
          await resend.contacts.create({
            email: user.email,
            firstName: user.displayName || user.email.split("@")[0],
            audienceId: process.env.RESEND_AUDIENCE_ID!,
            unsubscribed: false,
          })

          successCount++
          console.log(`✅ Added ${user.email} to Resend`)

          // Rate limiting - wait 100ms between requests
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error: any) {
          if (error.message?.includes("already exists")) {
            // Update existing contact
            try {
              await resend.contacts.update({
                email: user.email,
                firstName: user.displayName || user.email.split("@")[0],
                audienceId: process.env.RESEND_AUDIENCE_ID!,
                unsubscribed: false,
              })
              successCount++
              console.log(`🔄 Updated ${user.email} in Resend`)
            } catch (updateError) {
              errorCount++
              console.error(`❌ Failed to update ${user.email}:`, updateError)
            }
          } else {
            errorCount++
            console.error(`❌ Failed to add ${user.email}:`, error.message)
          }
        }
      }

      nextPageToken = listUsersResult.pageToken

      if (nextPageToken) {
        console.log(`⏳ Waiting 1 second before next batch...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } while (nextPageToken)

    console.log("🎉 Backfill completed!")
    console.log(`📊 Results:`)
    console.log(`   Total users processed: ${totalUsers}`)
    console.log(`   Successfully added/existing: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)

    return NextResponse.json({
      success: true,
      totalUsers,
      successCount,
      errorCount,
      message: "Backfill completed successfully",
    })
  } catch (error) {
    console.error("❌ Backfill failed:", error)
    return NextResponse.json(
      {
        error: "Backfill failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
