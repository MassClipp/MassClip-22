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
    }

    if (membershipResponse?.ok) {
      const membershipData = await membershipResponse.json()

      // Simple check - if membership is active, user has pro plan
      if (membershipData.isActive) {
        subscriptionData = {
          plan: "creator_pro",
          isActive: true,
          status: membershipData.status || "active",
          currentPeriodEnd: membershipData.currentPeriodEnd || null,
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
    })
  } finally {
    setLoadingSubscription(false)
  }
}
