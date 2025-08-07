"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, TrendingUp, CreditCard, BarChart3, Bug, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import EarningsDebugPanel from "@/components/earnings-debug-panel"

export default function EarningsContent() {
  const { earningsData, isLoading, error, refetch } = useStripeEarnings()
  const [showDebug, setShowDebug] = useState(false)

  // Determine connection status based on the actual data
  const getConnectionStatus = () => {
    if (isLoading) return { status: 'loading', label: 'Checking...', variant: 'secondary' as const }
    if (error) return { status: 'error', label: 'Error', variant: 'destructive' as const }
    if (!earningsData) return { status: 'unknown', label: 'Unknown', variant: 'secondary' as const }
    
    // Check if it's explicitly marked as unconnected
    if (earningsData.isUnconnected) {
      return { status: 'unconnected', label: 'Not Connected', variant: 'destructive' as const }
    }
    
    // Check if account is not ready (connected but incomplete setup)
    if (earningsData.accountNotReady) {
      return { status: 'incomplete', label: 'Setup Required', variant: 'secondary' as const }
    }
    
    // Check account status flags
    const { accountStatus } = earningsData
    if (!accountStatus?.chargesEnabled || !accountStatus?.payoutsEnabled || !accountStatus?.detailsSubmitted) {
      return { status: 'incomplete', label: 'Setup Required', variant: 'secondary' as const }
    }
    
    // If we have real earnings data (not demo/zero), consider it connected
    if (earningsData.totalEarnings > 0 || earningsData.recentTransactions?.length > 0) {
      return { status: 'connected', label: 'Connected', variant: 'default' as const }
    }
    
    // Account is set up but no earnings yet
    return { status: 'ready', label: 'Ready', variant: 'default' as const }
  }

  const connectionStatus = getConnectionStatus()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '+0.0%'
    const percentage = ((current - previous) / previous) * 100
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Earnings</h1>
            <p className="text-gray-400">Loading financial overview...</p>
          </div>
          <Badge variant="secondary">Loading...</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-900/50 border-gray-700 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-8 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Earnings</h1>
            <Badge variant={connectionStatus.variant}>
              {connectionStatus.status === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
              {connectionStatus.status === 'unconnected' && <XCircle className="h-3 w-3 mr-1" />}
              {connectionStatus.status === 'incomplete' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {connectionStatus.label}
            </Badge>
          </div>
          <p className="text-gray-400">Financial overview and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="border-gray-600 text-gray-400 hover:bg-gray-700"
          >
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="border-gray-600 text-gray-400 hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="bg-red-900/20 border-red-600/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading earnings data</span>
            </div>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      {showDebug && (
        <EarningsDebugPanel 
          earningsData={earningsData} 
          loading={isLoading} 
          error={error} 
        />
      )}

      {/* Main Content */}
      {earningsData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Earnings</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(earningsData.totalEarnings)}
                    </p>
                    <p className="text-xs text-gray-500">All-time revenue</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">This Month</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(earningsData.thisMonthEarnings)}
                    </p>
                    <p className="text-xs text-green-500">
                      {formatPercentage(earningsData.thisMonthEarnings, earningsData.lastMonthEarnings)} from last month
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Available Balance</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(earningsData.availableBalance)}
                    </p>
                    <p className="text-xs text-gray-500">Ready for payout</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Total Sales</p>
                    <p className="text-2xl font-bold text-white">
                      {earningsData.salesMetrics?.totalSales || 0}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(earningsData.salesMetrics?.averageTransactionValue || 0)} avg order
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Content */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-gray-800 border-gray-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">Overview</TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-gray-700">Transactions</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-700">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Performance */}
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Performance</CardTitle>
                    <p className="text-sm text-gray-400">Your earnings breakdown</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Last 30 Days</span>
                      <span className="text-white font-medium">
                        {formatCurrency(earningsData.last30DaysEarnings)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">This Month Sales</span>
                      <span className="text-white font-medium">
                        {earningsData.salesMetrics?.thisMonthSales || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Last 30 Days Sales</span>
                      <span className="text-white font-medium">
                        {earningsData.salesMetrics?.last30DaysSales || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payout Information */}
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Payout Information</CardTitle>
                    <p className="text-sm text-gray-400">Balance and payout status</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Pending Payout</span>
                      <span className="text-white font-medium">
                        {formatCurrency(earningsData.pendingPayout)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Available Balance</span>
                      <span className="text-green-500 font-medium">
                        {formatCurrency(earningsData.availableBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Account Status</span>
                      <Badge variant={connectionStatus.status === 'connected' ? 'default' : 'destructive'}>
                        {connectionStatus.status === 'connected' ? 'Active' : 'Setup Required'}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-600 text-gray-400 hover:bg-gray-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Stripe Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                  <p className="text-sm text-gray-400">Your latest payment activity</p>
                </CardHeader>
                <CardContent>
                  {earningsData.recentTransactions && earningsData.recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {earningsData.recentTransactions.map((transaction, index) => (
                        <div key={transaction.id || index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{transaction.description}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(transaction.created).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">
                              {formatCurrency(transaction.net || transaction.amount)}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">{transaction.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No transactions yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Monthly Breakdown</CardTitle>
                  <p className="text-sm text-gray-400">Earnings over time</p>
                </CardHeader>
                <CardContent>
                  {earningsData.monthlyBreakdown && earningsData.monthlyBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {earningsData.monthlyBreakdown.map((month, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{month.month}</p>
                            <p className="text-xs text-gray-400">{month.transactionCount} transactions</p>
                          </div>
                          <p className="text-white font-medium">
                            {formatCurrency(month.earnings)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No analytics data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
