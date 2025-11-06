/**
 * One-off backfill:
 * - Iterates through all Firebase Auth users
 * - For any user who is not an active Creator Pro, ensures a complete freeUsers document
 *
 * Run from v0 Scripts UI. Watch the console logs to track progress.
 */

import { adminAuth } from "@/lib/firebase-admin"
import { UserTrackingService } from "@/lib/user-tracking-service"

async function backfill() {
  console.log("🔄 Backfill starting...")

  let nextPageToken: string | undefined = undefined
  let processed = 0
  let ensured = 0

  do {
    const list = await adminAuth.listUsers(1000, nextPageToken)
    for (const u of list.users) {
      processed += 1
      const uid = u.uid
      const email = u.email || ""

      try {
        // If user is not active Creator Pro, create/merge freeUsers
        const res = await UserTrackingService.ensureFreeUserForNonPro(uid, email)
        if (res.ensured) {
          ensured += 1
          console.log(`✅ Ensured freeUsers for ${uid} (${email})`)
        } else {
          console.log(`ℹ️ Skipped ${uid} (${email}) – reason: ${res.reason}`)
        }
      } catch (e) {
        console.error(`❌ Failed ensuring freeUsers for ${uid}:`, e)
      }
    }
    nextPageToken = list.pageToken
  } while (nextPageToken)

  console.log(`🏁 Backfill complete. Processed: ${processed}, Ensured: ${ensured}`)
}

backfill().catch((e) => {
  console.error("❌ Backfill crashed:", e)
})
