import type { User } from "firebase/auth"

export async function fetchSubscriptionData(
  user: User | null,
  setSubscriptionData: (data: any) => void,
  setLoadingSubscription: (loading: boolean) => void,
) {
  if (!user) return

  try {
    setLoadingSubscription(true)

    const response = await fetch("/api/membership-status", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch subscription data")
    }

    const data = await response.json()
    setSubscriptionData(data)
  } catch (error) {
    console.error("Error fetching subscription data:", error)
    setSubscriptionData(null)
  } finally {
    setLoadingSubscription(false)
  }
}
