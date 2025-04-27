"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import DashboardHeader from "@/components/dashboard-header"
import CancelSubscriptionButton from "@/components/cancel-subscription-button"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface SubscriptionDetails {
  status: string
  currentPeriodEnd?: string
  canceledAt?: string
}

export default function SubscriptionPage() {
  const { user } = useAuth()
  const { planData, isProUser } = useUserPlan()
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()

          const details: SubscriptionDetails = {
            status: userData.subscriptionStatus || "inactive",
          }

          if (userData.subscriptionEndDate) {
            details.currentPeriodEnd = userData.subscriptionEndDate
          }

          if (userData.subscriptionCanceledAt) {
            details.canceledAt = userData.subscriptionCanceledAt
          }

          setSubscriptionDetails(details)
        }
      } catch (error) {
        console.error("Error fetching subscription details:", error)
        toast({
          title: "Error",
          description: "Failed to load subscription details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriptionDetails()
  }, [user, toast])

  const handleUpgrade = () => {
    router.push("/pricing")
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "MMMM d, yyyy")
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-2xl font-bold mb-6">Subscription Management</h1>

        {loading ? (
          <div className="bg-gray-900 p-6 rounded-lg">
            <p>Loading subscription details...</p>
          </div>
        ) : (
          <div className="bg-gray-900 p-6 rounded-lg">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
              <div className="flex items-center mb-2">
                <span className="text-lg mr-2">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${isProUser ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"}`}
                >
                  {isProUser ? "PRO" : "FREE"}
                </span>
              </div>

              {isProUser && subscriptionDetails && (
                <>
                  <p className="mb-2">
                    Subscription Status: <span className="capitalize">{subscriptionDetails.status}</span>
                  </p>

                  {subscriptionDetails.status === "canceled" && subscriptionDetails.currentPeriodEnd && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                      <p className="text-yellow-300 mb-2">Your subscription has been canceled</p>
                      <p>
                        You will have access to Pro features until {formatDate(subscriptionDetails.currentPeriodEnd)}
                      </p>
                    </div>
                  )}

                  {subscriptionDetails.status === "active" && subscriptionDetails.currentPeriodEnd && (
                    <p className="mb-2">Next billing date: {formatDate(subscriptionDetails.currentPeriodEnd)}</p>
                  )}
                </>
              )}

              {!isProUser && (
                <div className="mt-4">
                  <p className="mb-4">Upgrade to Pro to unlock unlimited downloads and premium features.</p>
                  <button onClick={handleUpgrade} className="vault-button inline-block">
                    <span className="relative block px-6 py-2 text-white font-light border border-green-600 transition-colors duration-300">
                      Upgrade to Pro
                    </span>
                  </button>
                </div>
              )}
            </div>

            {isProUser && subscriptionDetails?.status === "active" && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Manage Subscription</h2>
                <CancelSubscriptionButton />
              </div>
            )}

            {isProUser && subscriptionDetails?.status === "canceled" && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Reactivate Subscription</h2>
                <button onClick={handleUpgrade} className="vault-button inline-block">
                  <span className="relative block px-6 py-2 text-white font-light border border-green-600 transition-colors duration-300">
                    Resubscribe
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
