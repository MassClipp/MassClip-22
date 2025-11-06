import type { User } from "firebase/auth"

export async function fetchSubscriptionData(
  user: User | null,
  setSubscriptionData: (data: any) => void,
  setLoadingSubscription: (loading: boolean) => void,
) {
  if (!user) return

  try {
    setLoadingSubscription(true)
    console.log("🔍 Fetching subscription data for:", user.uid)

    const membershipResponse = await fetch("/api/membership-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid }),
    })

    let subscriptionData = {
      plan: "free",
      isActive: false,
      status: "inactive",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }

    if (membershipResponse?.ok) {
      const membershipData = await membershipResponse.json()
      console.log("[v0] Raw membership API response:", membershipData)

      if (membershipData.isActive) {
        subscriptionData = {
          plan: membershipData.plan || "creator_pro", // Use actual plan from API
          isActive: true,
          status: membershipData.status || "active",
          currentPeriodEnd: membershipData.currentPeriodEnd || null,
          cancelAtPeriodEnd: membershipData.cancelAtPeriodEnd || false,
        }
      } else {
        // Even if not active, preserve cancellation data for display
        subscriptionData = {
          plan: membershipData.plan || "free", // Use actual plan even when inactive
          isActive: false,
          status: membershipData.status || "inactive",
          currentPeriodEnd: membershipData.currentPeriodEnd || null,
          cancelAtPeriodEnd: membershipData.cancelAtPeriodEnd || false,
        }
      }
    }

    console.log("✅ Final subscription data:", subscriptionData)
    setSubscriptionData(subscriptionData)
  } catch (error) {
    console.error("❌ Error fetching subscription data:", error)
    setSubscriptionData({
      plan: "free",
      isActive: false,
      status: "inactive",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
  } finally {
    setLoadingSubscription(false)
  }
}
