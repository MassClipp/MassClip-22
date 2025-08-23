import { adminAuth } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

async function backfillUsersToResend() {
  console.log("🔄 Starting backfill of existing users to Resend...")

  if (!process.env.RESEND_AUDIENCE_ID) {
    console.error("❌ RESEND_AUDIENCE_ID environment variable is required")
    process.exit(1)
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY environment variable is required")
    process.exit(1)
  }

  let totalUsers = 0
  let successCount = 0
  let errorCount = 0
  let nextPageToken: string | undefined

  try {
    do {
      console.log(`📄 Fetching users batch (token: ${nextPageToken || "first"})...`)

      const listUsersResult = await adminAuth.listUsers(1000, nextPageToken)
      const users = listUsersResult.users

      console.log(`📋 Processing ${users.length} users...`)

      for (const user of users) {
        totalUsers++

        if (!user.email) {
          console.warn(`⚠️ Skipping user ${user.uid} - no email`)
          continue
        }

        try {
          const contactName = user.displayName || user.email.split("@")[0]

          console.log(`📧 Adding ${user.email} to Resend...`)

          const result = await resend.contacts.create({
            email: user.email,
            firstName: contactName,
            audienceId: process.env.RESEND_AUDIENCE_ID!,
            unsubscribed: false,
          })

          successCount++
          console.log(`✅ Added ${user.email} (${successCount}/${totalUsers})`)

          // Rate limiting - wait 100ms between requests
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error: any) {
          errorCount++

          if (error.message?.includes("already exists")) {
            console.log(`ℹ️ ${user.email} already exists in Resend`)
            successCount++ // Count as success since they're already there
          } else {
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

    console.log("\n🎉 Backfill completed!")
    console.log(`📊 Results:`)
    console.log(`   Total users processed: ${totalUsers}`)
    console.log(`   Successfully added/existing: ${successCount}`)
    console.log(`   Errors: ${errorCount}`)
  } catch (error) {
    console.error("❌ Backfill failed:", error)
    process.exit(1)
  }
}

// Run the backfill
backfillUsersToResend()
