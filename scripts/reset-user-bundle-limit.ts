import { adminDb } from "@/lib/firebase-admin"

// Script to reset a user's bundle limit back to the base free tier limit of 2
// Usage: Update the USER_ID below and run this script

const USER_ID = "YOUR_USER_ID_HERE" // Replace with the actual user ID

async function resetUserBundleLimit() {
  try {
    console.log(`🔍 Checking bundle limit for user: ${USER_ID}`)

    // Get current freeUsers document
    const freeUserRef = adminDb.collection("freeUsers").doc(USER_ID)
    const freeUserDoc = await freeUserRef.get()

    if (!freeUserDoc.exists) {
      console.log("❌ No freeUsers document found for this user")
      return
    }

    const currentData = freeUserDoc.data()
    console.log("📊 Current freeUsers data:", JSON.stringify(currentData, null, 2))

    const currentBundleLimit = currentData?.bundlesLimit || 2
    console.log(`📈 Current bundle limit: ${currentBundleLimit}`)

    if (currentBundleLimit === 2) {
      console.log("✅ Bundle limit is already correct (2)")
      return
    }

    // Check if user has any bundle slot purchases
    const bundleSlotsDoc = await adminDb.collection("userBundleSlots").doc(USER_ID).get()
    if (bundleSlotsDoc.exists) {
      console.log("💰 User has bundle slots document:", JSON.stringify(bundleSlotsDoc.data(), null, 2))
    }

    // Check user's actual bundles
    const bundlesSnapshot = await adminDb.collection("bundles").where("creatorId", "==", USER_ID).get()
    console.log(`📦 User has ${bundlesSnapshot.size} bundles created`)

    // Reset to base limit of 2
    console.log(`🔄 Resetting bundle limit from ${currentBundleLimit} to 2...`)

    await freeUserRef.update({
      bundlesLimit: 2,
    })

    console.log("✅ Bundle limit reset to 2 successfully!")

    // Verify the change
    const updatedDoc = await freeUserRef.get()
    const updatedData = updatedDoc.data()
    console.log("🔍 Updated bundle limit:", updatedData?.bundlesLimit)
  } catch (error) {
    console.error("❌ Error resetting bundle limit:", error)
  }
}

// Run the script
resetUserBundleLimit()
