'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import { DollarSign, TrendingUp, CreditCard, BarChart3, RefreshCw, AlertCircle, CheckCircle, ExternalLink, Bug } from 'lucide-react'
import { useState } from "react"

export default function EarningsContent() {
  const { earningsData, isLoading, error, refetch } = useStripeEarnings()
  const [showDebug, setShowDebug] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Earnings</h1>
            <p className="text-muted-foreground">Financial overview and performance metrics</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                <div className="h-4 w-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Loading data...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Earnings</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Financial overview and performance metrics
              <Badge variant="destructive">Error</Badge>
            </p>
          </div>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error Loading Earnings Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!earningsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Earnings</h1>
            <p className="text-muted-foreground">Financial overview and performance metrics</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Unable to load earnings data at this time.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getAccountStatusBadge = () => {
    if (earningsData.isUnconnected) {
      return <Badge variant="destructive">Not Connected</Badge>
    }
    
    if (!earningsData.accountStatus.chargesEnabled || !earningsData.accountStatus.detailsSubmitted) {
      return <Badge variant="destructive">Setup Required</Badge>
    }
    
    return <Badge variant="default" className="bg-green-600">Active</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Financial overview and performance metrics
            {getAccountStatusBadge()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowDebug(!showDebug)} variant="outline" size="sm">
            <Bug className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {showDebug && earningsData.debug && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-blue-600" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Execution Log:</h4>
                <div className="bg-slate-900 text-green-400 p-4 rounded-lg text-sm font-mono max-h-64 overflow-y-auto">
                  {earningsData.debug.logs?.map((log: any, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-blue-400">[{log.step}]</span> {log.action} 
                      {log.timestamp && <span className="text-gray-500"> ({new Date(log.timestamp).toLocaleTimeString()})</span>}
                      {log.error && <span className="text-red-400"> ERROR: {log.error}</span>}
                      {log.userId && <span className="text-yellow-400"> User: {log.userId}</span>}
                      {log.stripeAccountId && <span className="text-purple-400"> Stripe: {log.stripeAccountId}</span>}
                    </div>
                  ))}
                </div>
              </div>
              {earningsData.debug.reason && (
                <div>
                  <strong>Result:</strong> {earningsData.debug.reason}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earningsData.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earningsData.thisMonthEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              +0.0% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earningsData.availableBalance)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earningsData.salesMetrics.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(earningsData.salesMetrics.averageTransactionValue)} avg order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
                <CardDescription>Your earnings breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last 30 Days</span>
                  <span className="font-medium">{formatCurrency(earningsData.last30DaysEarnings)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">This Month Sales</span>
                  <span className="font-medium">{earningsData.salesMetrics.thisMonthSales}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last 30 Days Sales</span>
                  <span className="font-medium">{earningsData.salesMetrics.last30DaysSales}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payout Information</CardTitle>
                <CardDescription>Balance and payout status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Payout</span>
                  <span className="font-medium">{formatCurrency(earningsData.pendingPayout)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Available Balance</span>
                  <span className="font-medium text-green-600">{formatCurrency(earningsData.availableBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Account Status</span>
                  <div className="flex items-center gap-2">
                    {earningsData.accountStatus.chargesEnabled && earningsData.accountStatus.detailsSubmitted ? (
                      <Badge variant="default" className="bg-green-600">Setup Required</Badge>
                    ) : (
                      <Badge variant="destructive">Setup Required</Badge>
                    )}
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Stripe Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsData.recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {earningsData.recentTransactions.map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Net: {formatCurrency(transaction.net)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No transactions yet. Start selling to see your payment history here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Analytics</CardTitle>
              <CardDescription>Performance insights and trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Monthly Breakdown</h4>
                  {earningsData.monthlyBreakdown.length > 0 ? (
                    <div className="space-y-2">
                      {earningsData.monthlyBreakdown.map((month, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{month.month}</span>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(month.earnings)}</div>
                            <div className="text-xs text-muted-foreground">
                              {month.transactionCount} sales
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No monthly data available yet.</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Key Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Order Value</span>
                      <span className="font-medium">
                        {formatCurrency(earningsData.salesMetrics.averageTransactionValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Conversion Rate</span>
                      <span className="font-medium">
                        {earningsData.salesMetrics.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(earningsData.lastUpdated).toLocaleString()}
      </div>
    </div>
  )
}
