import { getMembership } from "@/lib/memberships-service"

export interface CustomDomainPermissions {
  canUseCustomDomain: boolean
  plan: string
  reason?: string
}

/**
 * Check if a user has permission to use custom domains
 * Custom domains are available for: facelessprenuer plan
 */
export async function checkCustomDomainPermissions(uid: string): Promise<CustomDomainPermissions> {
  try {
    // Check membership from memberships collection
    const membership = await getMembership(uid)

    if (!membership || !membership.isActive) {
      return {
        canUseCustomDomain: false,
        plan: "free",
        reason: "No active membership found",
      }
    }

    const allowedPlans = ["facelessprenuer"]
    const canUseCustomDomain = allowedPlans.includes(membership.plan)

    if (!canUseCustomDomain) {
      return {
        canUseCustomDomain: false,
        plan: membership.plan,
        reason: `Custom domains require Facelessprenuer membership (current: ${membership.plan})`,
      }
    }

    return {
      canUseCustomDomain: true,
      plan: membership.plan,
    }
  } catch (error) {
    console.error("[Custom Domain Permissions] Error checking permissions:", error)
    return {
      canUseCustomDomain: false,
      plan: "unknown",
      reason: "Error checking permissions",
    }
  }
}

/**
 * Verify user has active custom domain permissions and throw if not
 */
export async function requireCustomDomainPermissions(uid: string): Promise<void> {
  const permissions = await checkCustomDomainPermissions(uid)

  if (!permissions.canUseCustomDomain) {
    throw new Error(permissions.reason || "You don't have permission to use custom domains")
  }
}
