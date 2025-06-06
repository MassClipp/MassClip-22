"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, orderBy, getDocs, limit, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, DollarSign, ArrowRight, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import StripeStatus from "@/components/stripe-status"
import SSNCompletionPrompt from "@/components/ssn-completion-prompt"
import { useToast } from "@/components/ui/use-toast"

export default function EarningsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalSales: 0,
    recentSales: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    pendingPayout: 0,
  })
  const [stripeStatus, setStripeStatus] = useState({
    isConnected: false,
    accountId: "",
    chargesEnabled: false,
    payoutsEnabled: false,
    onboardingComplete: false,
  })

  const fetchData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get user data for Stripe status
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setStripeStatus({
          isConnected: !!userData.stripeAccountId,
          accountId: userData.stripeAccountId || "",
          chargesEnabled: userData.chargesEnabled || false,
          payoutsEnabled: userData.payoutsEnabled || false,
          onboardingComplete: userData.stripeOnboardingComplete || false,
        })
      }

      // Get sales from Firestore
      const salesQuery = query(collection(db, "users", user.uid, "sales"), orderBy("purchasedAt", "desc"), limit(100))

      const salesSnapshot = await getDocs(salesQuery)
      const salesData = salesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        purchasedAt: doc.data().purchasedAt?.toDate() || new Date(),
      }))

      setSales(salesData)

      // Calculate stats
      const totalEarnings = salesData.reduce((sum, sale) => sum + (sale.netAmount || 0), 0)
      const totalSales = salesData.length

      // Recent sales (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentSales = salesData.filter((sale) => sale.purchasedAt >= thirtyDaysAgo).length

      // This month earnings
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)
      const thisMonthEarnings = salesData
        .filter((sale) => sale.purchasedAt >= thisMonth)
        .reduce((sum, sale) => sum + (sale.netAmount || 0), 0)

      // Last month earnings
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      lastMonth.setDate(1)
      lastMonth.setHours(0, 0, 0, 0)
      const lastMonthEnd = new Date()
      lastMonthEnd.setDate(0)
      lastMonthEnd.setHours(23, 59, 59, 999)
      const lastMonthEarnings = salesData
        .filter((sale) => sale.purchasedAt >= lastMonth && sale.purchasedAt <= lastMonthEnd)
        .reduce((sum, sale) => sum + (sale.netAmount || 0), 0)

      // Pending payout (simplified - in a real app this would come from Stripe)
      const pendingPayout = thisMonthEarnings

      setStats({
        totalEarnings,
        totalSales,
        recentSales,
        thisMonthEarnings,
        lastMonthEarnings,
        pendingPayout,
      })

      // Check for verification completion from URL params
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get("verification") === "complete") {
        toast({
          title: "Verification Complete",
          description: "Your account verification has been submitted. It may take 1-2 business days to process.",
        })
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (error) {
      console.error("Error fetching sales:", error)
      toast({
        title: "Error",
        description: "Failed to load earnings data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
          <p className="text-zinc-400 mt-1">Manage your revenue and payment settings</p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-700 hover:bg-zinc-800"
        >
          {refreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
              <CardDescription>Your revenue statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-1">Total Earnings</div>
                  <div className="text-2xl font-bold text-white flex items-center">
                    <DollarSign className="h-5 w-5 text-green-500 mr-1" />${stats.totalEarnings.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Lifetime</div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-1">This Month</div>
                  <div className="text-2xl font-bold text-white flex items-center">
                    <DollarSign className="h-5 w-5 text-blue-500 mr-1" />${stats.thisMonthEarnings.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {stats.lastMonthEarnings > 0 ? (
                      <>
                        {stats.thisMonthEarnings > stats.lastMonthEarnings ? (
                          <span className="text-green-500">↑</span>
                        ) : (
                          <span className="text-red-500">↓</span>
                        )}{" "}
                        vs ${stats.lastMonthEarnings.toFixed(2)} last month
                      </>
                    ) : (
                      "No earnings last month"
                    )}
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-sm text-zinc-400 mb-1">Pending Payout</div>
                  <div className="text-2xl font-bold text-white flex items-center">
                    <DollarSign className="h-5 w-5 text-amber-500 mr-1" />${stats.pendingPayout.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {stripeStatus.payoutsEnabled ? "Processed monthly" : "Connect Stripe to receive"}
                  </div>
                </div>
              </div>

              {stripeStatus.isConnected && stripeStatus.accountId && (
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="text-sm border-zinc-700 hover:bg-zinc-800"
                    onClick={() => window.open(`https://dashboard.stripe.com/${stripeStatus.accountId}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Stripe Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm mt-6">
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>Your transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
                  <TabsTrigger value="all">All Time</TabsTrigger>
                  <TabsTrigger value="month">This Month</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  {sales.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-zinc-500 mb-4">No sales yet</p>
                      <Button
                        variant="outline"
                        onClick={() => (window.location.href = "/dashboard/upload?premium=true")}
                      >
                        Upload Premium Content
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Video</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Amount</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Fee</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((sale) => (
                            <tr key={sale.id} className="border-b border-zinc-800/50">
                              <td className="py-3 px-4 text-sm">{format(sale.purchasedAt, "MMM d, yyyy")}</td>
                              <td className="py-3 px-4 text-sm">{sale.videoTitle || "Premium Content"}</td>
                              <td className="py-3 px-4 text-sm">${sale.amount?.toFixed(2) || "0.00"}</td>
                              <td className="py-3 px-4 text-sm text-zinc-500">
                                -${sale.platformFee?.toFixed(2) || "0.00"}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-green-500">
                                ${sale.netAmount?.toFixed(2) || "0.00"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="month" className="mt-4">
                  {sales.filter((sale) => {
                    const thisMonth = new Date()
                    thisMonth.setDate(1)
                    thisMonth.setHours(0, 0, 0, 0)
                    return sale.purchasedAt >= thisMonth
                  }).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-zinc-500">No sales this month</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Date</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Video</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Amount</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Fee</th>
                            <th className="text-left py-3 px-4 font-medium text-zinc-400">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales
                            .filter((sale) => {
                              const thisMonth = new Date()
                              thisMonth.setDate(1)
                              thisMonth.setHours(0, 0, 0, 0)
                              return sale.purchasedAt >= thisMonth
                            })
                            .map((sale) => (
                              <tr key={sale.id} className="border-b border-zinc-800/50">
                                <td className="py-3 px-4 text-sm">{format(sale.purchasedAt, "MMM d, yyyy")}</td>
                                <td className="py-3 px-4 text-sm">{sale.videoTitle || "Premium Content"}</td>
                                <td className="py-3 px-4 text-sm">${sale.amount?.toFixed(2) || "0.00"}</td>
                                <td className="py-3 px-4 text-sm text-zinc-500">
                                  -${sale.platformFee?.toFixed(2) || "0.00"}
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-green-500">
                                  ${sale.netAmount?.toFixed(2) || "0.00"}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div>
          <StripeStatus />

          {/* Show SSN completion prompt if Stripe is connected but not fully verified */}
          {stripeStatus.isConnected && stripeStatus.accountId && !stripeStatus.onboardingComplete && (
            <div className="mt-6">
              <SSNCompletionPrompt accountId={stripeStatus.accountId} />
            </div>
          )}

          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm mt-6">
            <CardHeader>
              <CardTitle>Payout Schedule</CardTitle>
              <CardDescription>When you'll receive your money</CardDescription>
            </CardHeader>
            <CardContent>
              {stripeStatus.payoutsEnabled ? (
                <div className="space-y-4">
                  <div className="bg-zinc-800/50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-white mb-1">Next Payout</div>
                    <div className="text-2xl font-bold text-white flex items-center">
                      <DollarSign className="h-5 w-5 text-green-500 mr-1" />${stats.pendingPayout.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Estimated on{" "}
                      {format(new Date(new Date().setDate(1)).setMonth(new Date().getMonth() + 1), "MMM d, yyyy")}
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400">
                    Stripe processes payouts on a monthly basis. Funds from your sales will be transferred directly to
                    your bank account.
                  </p>

                  <Button
                    variant="outline"
                    className="w-full justify-center border-zinc-700 hover:bg-zinc-800"
                    onClick={() =>
                      window.open(`https://dashboard.stripe.com/${stripeStatus.accountId}/balance`, "_blank")
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Payout Details
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-zinc-500 mb-4">Connect your Stripe account to receive payouts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
