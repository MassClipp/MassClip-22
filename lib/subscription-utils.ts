import type { User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function fetchSubscriptionData(
  user: User | null,
  setSubscriptionData: (data: any) => void,
  setLoadingSubscription: (loading: boolean) => void,
) {
  if (!user) return

  try {
    setLoadingSubscription(true)
    console.log("🔍 Fetching subscription data for:", user.uid)

    const userDoc = await getDoc(doc(db, "users", user.uid))

    if (userDoc.exists()) {
      const userData = userDoc.data()
      const subscriptionData = {
        plan: userData.subscriptionPlan || "free",
        isActive: userData.subscriptionStatus === "active",
        status: userData.subscriptionStatus || "inactive",
        currentPeriodEnd: userData.subscriptionCurrentPeriodEnd || null,
      }

      console.log("✅ Subscription data loaded:", subscriptionData)
      setSubscriptionData(subscriptionData)
    } else {
      console.log("❌ No user document found for subscription data")
      setSubscriptionData({
        plan: "free",
        isActive: false,
        status: "inactive",
        currentPeriodEnd: null,
      })
    }
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
