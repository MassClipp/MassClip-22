"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useStripeConnectionCheck } from "@/hooks/use-stripe-connection-check"
import StripeConnectionPrompt from "@/components/stripe-connection-prompt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, CreditCard } from "lucide-react"

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const { isConnected, loading: connectionLoading, connectionStatus, refreshStatus } = useStripeConnectionCheck()
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    transactions: 0,
  })
  const [earningsLoading, setEarningsLoading] = useState(false)

  // Handle URL parameters for Stripe onboarding returns
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const refresh = urlParams.get("refresh")

    if (success === "true") {
      console.log("✅ Returned from successful Stripe onboarding")
      // Clean URL and refresh status
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => refreshStatus(), 1000)
    } else if (refresh === "true") {
      console.log("🔄 Returned from Stripe onboarding refresh")
      // Clean URL and refresh status
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => refreshStatus(), 1000)
    }
  }, [refreshStatus])

  // Fetch earnings data when connected
  useEffect(() => {
    if (isConnected && user) {
      fetchEarnings()
    }
  }, [isConnected, user])

  const fetchEarnings = async () => {
    if (!user) return

    try {
      setEarningsLoading(true)
      const idToken = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEarnings({
          total: data.total || 0,
          thisMonth: data.thisMonth || 0,
          lastMonth: data.lastMonth || 0,
          transactions: data.transactions || 0,
        })
      } else {
        console.error("Failed to fetch earnings:", response.status)
      }
    } catch (error) {
      console.error("Error fetching earnings:", error)
    } finally {
      setEarningsLoading(false)
    }
  }

  if (authLoading || connectionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-zinc-900/60 border-zinc-800/50">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <StripeConnectionPrompt
          onConnectionSuccess={() => {
            refreshStatus()
            fetchEarnings()
          }}
          existingStatus={connectionStatus}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Earnings Dashboard</h1>
          <p className="text-zinc-400">Track your revenue and performance</p>
        </div>

        {/* Earnings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-white">${(earnings?.total ?? 0).toFixed(2)}</div>
              )}
              <p className="text-xs text-zinc-400">All time revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-white">${(earnings?.thisMonth ?? 0).toFixed(2)}</div>
              )}
              <p className="text-xs text-zinc-400">Current month earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Last Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-white">${(earnings?.lastMonth ?? 0).toFixed(2)}</div>
              )}
              <p className="text-xs text-zinc-400">Previous month earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-white">{earnings?.transactions ?? 0}</div>
              )}
              <p className="text-xs text-zinc-400">Total sales</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Status */}
        {connectionStatus && (
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-white">Stripe Account Status</CardTitle>
              <CardDescription>Your payment processing capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connectionStatus.capabilities?.charges_enabled ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm text-zinc-300">Accept Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connectionStatus.capabilities?.payouts_enabled ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm text-zinc-300">Receive Payouts</span>
                </div>
              </div>
              <div className="text-sm text-zinc-400">
                Account Type: {connectionStatus.businessType === "company" ? "Business" : "Individual"}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
