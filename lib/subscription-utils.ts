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

    const [userDoc, membershipResponse] = await Promise.all([
      getDoc(doc(db, "users", user.uid)),
      fetch("/api/membership-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      }).catch(() => null),
    ])

    let subscriptionData = {
      plan: "free",
      isActive: false,
      status: "inactive",
      currentPeriodEnd: null,
    }

    if (membershipResponse?.ok) {
      const membershipData = await membershipResponse.json()

      let isExpired = false
      if (membershipData.currentPeriodEnd) {
        const endDate = new Date(membershipData.currentPeriodEnd)
        const now = new Date()
        isExpired = now > endDate

        console.log("🕐 Subscription date check:", {
          endDate: endDate.toISOString(),
          now: now.toISOString(),
          isExpired,
        })
      }

      if (membershipData.plan === "creator_pro" && membershipData.isActive && !isExpired) {
        subscriptionData = {
          plan: "creator_pro",
          isActive: true,
          status: membershipData.status || "active",
          currentPeriodEnd: membershipData.currentPeriodEnd || null,
        }
      } else if (isExpired) {
        console.log("⚠️ Subscription expired, reverting to free plan")
        subscriptionData = {
          plan: "free",
          isActive: false,
          status: "expired",
          currentPeriodEnd: membershipData.currentPeriodEnd || null,
        }
      }
    }

    if (subscriptionData.plan === "free" && userDoc.exists()) {
      const userData = userDoc.data()
      const userPlan = userData.plan === "pro" ? "creator_pro" : userData.plan
      const subscriptionPlan = userData.subscriptionPlan === "pro" ? "creator_pro" : userData.subscriptionPlan

      if (userPlan === "creator_pro" || subscriptionPlan === "creator_pro") {
        let isExpired = false
        if (userData.subscriptionCurrentPeriodEnd) {
          const endDate = new Date(userData.subscriptionCurrentPeriodEnd)
          const now = new Date()
          isExpired = now > endDate
        }

        if (!isExpired) {
          subscriptionData = {
            plan: "creator_pro",
            isActive: userData.subscriptionStatus === "active" || userData.plan === "creator_pro",
            status: userData.subscriptionStatus || "active",
            currentPeriodEnd: userData.subscriptionCurrentPeriodEnd || null,
          }
        } else {
          console.log("⚠️ Legacy subscription expired, keeping free plan")
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
