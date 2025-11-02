export async function trackOnboardingStep(userId: string, stepId: string, idToken: string) {
  try {
    const response = await fetch("/api/user/onboarding-progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ stepId }),
    })

    if (!response.ok) {
      console.error("[Onboarding Tracker] Failed to track step:", stepId)
      return false
    }

    console.log("[Onboarding Tracker] Step completed:", stepId)
    return true
  } catch (error) {
    console.error("[Onboarding Tracker] Error:", error)
    return false
  }
}

export const ONBOARDING_STEPS = {
  SETUP_STOREFRONT: "setup_storefront",
  UPLOAD_CONTENT: "upload_content",
  ADD_FREE_CONTENT: "add_free_content",
  SETUP_STRIPE: "setup_stripe",
  CREATE_BUNDLE: "create_bundle",
  GO_LIVE: "go_live",
} as const
