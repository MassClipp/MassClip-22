import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"

export interface BundleLimitCheck {
  canCreate: boolean
  currentCount: number
  maxAllowed: number
  plan: string
  message?: string
}

/**
 * Check if user can create more bundles based on their plan
 */
export async function checkBundleLimit(userId: string): Promise<BundleLimitCheck> {
  try {
    console.log(`🔍 [Bundle Limits] Checking bundle limit for user: ${userId}`)

    // Get user's plan
    const userDoc = await getDoc(doc(db, "users", userId))
    const userData = userDoc.data()
    const userPlan = userData?.plan || "free"

    console.log(`📋 [Bundle Limits] User plan: ${userPlan}`)

    // Get current bundle count
    const bundlesQuery = query(collection(db, "bundles"), where("creatorId", "==", userId))
    const bundlesSnapshot = await getDocs(bundlesQuery)
    const currentCount = bundlesSnapshot.size

    console.log(`📊 [Bundle Limits] Current bundle count: ${currentCount}`)

    // Determine limits based on plan
    let maxAllowed: number
    let canCreate: boolean
    let message: string | undefined

    switch (userPlan) {
      case "free":
        maxAllowed = 2
        canCreate = currentCount < maxAllowed
        if (!canCreate) {
          message = `Free users can create up to ${maxAllowed} bundles. Upgrade to create unlimited bundles.`
        }
        break

      case "pro":
      case "creator_pro":
        maxAllowed = -1 // Unlimited
        canCreate = true
        break

      default:
        // Default to free plan limits for unknown plans
        maxAllowed = 2
        canCreate = currentCount < maxAllowed
        if (!canCreate) {
          message = `Your current plan allows up to ${maxAllowed} bundles. Upgrade to create unlimited bundles.`
        }
        break
    }

    const result: BundleLimitCheck = {
      canCreate,
      currentCount,
      maxAllowed,
      plan: userPlan,
      message,
    }

    console.log(`✅ [Bundle Limits] Limit check result:`, result)

    return result
  } catch (error) {
    console.error("❌ [Bundle Limits] Error checking bundle limit:", error)
    
    // Default to restrictive limits on error
    return {
      canCreate: false,
      currentCount: 0,
      maxAllowed: 2,
      plan: "free",
      message: "Unable to verify bundle limits. Please try again.",
    }
  }
}

/**
 * Get bundle limit info for display purposes
 */
export function getBundleLimitInfo(plan: string): { maxAllowed: number; description: string } {
  switch (plan) {
    case "free":
      return {
        maxAllowed: 2,
        description: "Free users can create up to 2 bundles",
      }

    case "pro":
    case "creator_pro":
      return {
        maxAllowed: -1,
        description: "Unlimited bundles",
      }

    default:
      return {
        maxAllowed: 2,
        description: "Limited to 2 bundles",
      }
  }
}

/**
 * Format bundle limit status for UI display
 */
export function formatBundleLimitStatus(limitCheck: BundleLimitCheck): string {
  if (limitCheck.maxAllowed === -1) {
    return `${limitCheck.currentCount} bundles created`
  }
  
  return `${limitCheck.currentCount} of ${limitCheck.maxAllowed} bundles used`
}
