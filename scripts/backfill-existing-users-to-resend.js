const { initializeApp, getApps, cert } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
}

const auth = getAuth()

async function backfillUsersToResend() {
  console.log("🚀 Starting backfill of existing users to Resend...")

  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY environment variable is required")
    process.exit(1)
  }

  if (!process.env.RESEND_AUDIENCE_ID) {
    console.error("❌ RESEND_AUDIENCE_ID environment variable is required")
    process.exit(1)
  }

  let totalUsers = 0
  let successCount = 0
  let errorCount = 0
  let nextPageToken

  try {
    do {
      console.log(`📥 Fetching batch of users${nextPageToken ? " (next page)" : ""}...`)

      const listUsersResult = await auth.listUsers(1000, nextPageToken)
      const users = listUsersResult.users

      console.log(`👥 Processing ${users.length} users in this batch...`)

      for (const user of users) {
        if (!user.email) {
          console.log(`⚠️  Skipping user ${user.uid} - no email address`)
          continue
        }

        try {
          const contactData = {
            email: user.email,
            first_name: user.displayName || user.email.split("@")[0],
            unsubscribed: false,
          }

          const response = await fetch(`https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...contactData,
              on_duplicate: "overwrite",
            }),
          })

          if (response.ok) {
            console.log(`✅ Added ${user.email} to Resend`)
            successCount++
          } else {
            const errorData = await response.text()
            if (errorData.includes("already exists")) {
              console.log(`🔄 ${user.email} already exists in Resend`)
              successCount++ // Count as success since they're already there
            } else {
              console.error(`❌ Failed to add ${user.email}:`, errorData)
              errorCount++
            }
          }

          totalUsers++

          // Rate limiting - wait 100ms between requests
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          if (error.message?.includes("already exists")) {
            console.log(`🔄 ${user.email} already exists in Resend`)
            successCount++ // Count as success since they're already there
          } else {
            console.error(`❌ Failed to add ${user.email}:`, error.message)
            errorCount++
          }
        }
      }

      nextPageToken = listUsersResult.pageToken

      if (nextPageToken) {
        console.log("⏳ Waiting 1 second before next batch...")
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } while (nextPageToken)

    console.log("\n🎉 Backfill completed!")
    console.log(`📊 Results:`)
    console.log(`    Total users processed: ${totalUsers}`)
    console.log(`    Successfully added/existing: ${successCount}`)
    console.log(`    Errors: ${errorCount}`)
  } catch (error) {
    console.error("❌ Backfill failed:", error)
    process.exit(1)
  }
}

// Run the backfill
backfillUsersToResend()
