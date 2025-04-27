"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import DashboardHeader from "@/components/dashboard-header"
import { useUserPlan } from "@/hooks/use-user-plan"

export default function SubscriptionStatusPage() {
  const { user } = useAuth()
  const { planData, loading, error, isProUser } = useUserPlan()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Force a reload of the page to refresh the data
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-2xl font-bold mb-6">Subscription Status</h1>

        {loading ? (
          <div className="bg-gray-900 p-6 rounded-lg">
            <p>Loading subscription data...</p>
          </div>
        ) : error ? (
          <div className="bg-gray-900 p-6 rounded-lg">
            <p className="text-red-500">Error: {error}</p>
          </div>
        ) : (
          <div className="bg-gray-900 p-6 rounded-lg">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">User Information</h2>
              <p>User ID: {user?.uid}</p>
              <p>Email: {user?.email}</p>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Plan Details</h2>
              <p>
                Current Plan:{" "}
                <span className={isProUser ? "text-green-500" : "text-yellow-500"}>{planData?.plan.toUpperCase()}</span>
              </p>
              {planData?.plan === "free" && (
                <p>
                  Downloads: {planData.downloads} / {planData.downloadsLimit}
                </p>
              )}
              {planData?.plan === "pro" && <p className="text-green-500">You have unlimited downloads!</p>}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {refreshing ? "Refreshing..." : "Refresh Status"}
            </button>
          </div>
        )}

        <div className="mt-8 bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Subscription Troubleshooting</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Recently Subscribed?</h3>
              <p className="text-gray-400">
                If you've just subscribed, it may take a few moments for your subscription to be activated. Try
                refreshing this page.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Payment Successful?</h3>
              <p className="text-gray-400">
                Check your email for a payment confirmation from Stripe. If you received a confirmation but your
                subscription isn't active, please contact support.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium">Need Help?</h3>
              <p className="text-gray-400">
                If you're experiencing issues with your subscription, please contact our support team with your user ID
                and the email address you used for payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
