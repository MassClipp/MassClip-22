"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import EarningsContent from "@/app/dashboard/earnings/earnings-content"

interface TestScenario {
  name: string
  description: string
  data: any
}

export default function EarningsTestPage() {
  const [currentScenario, setCurrentScenario] = useState<TestScenario | null>(null)

  const testScenarios: TestScenario[] = [
    {
      name: "No Sales Data",
      description: "User with no sales - should show 'no data' states instead of synthetic data",
      data: {
        totalEarnings: 0,
        grossSales: 0,
        totalPlatformFees: 0,
        thisMonth: 0,
        thisMonthGross: 0,
        thisMonthPlatformFees: 0,
        availableBalance: 0,
        totalSales: 0,
        avgOrderValue: 0,
        monthlyGrowth: 0,
        last30Days: 0,
        last30DaysGross: 0,
        last30DaysPlatformFees: 0,
        thisMonthSales: 0,
        last30DaysSales: 0,
        pendingPayout: 0,
        accountStatus: "Active",
        stripeAccountId: "acct_test123",
      },
    },
    {
      name: "With Real Sales",
      description: "User with actual sales data - should show real metrics",
      data: {
        totalEarnings: 850.5,
        grossSales: 1000.0,
        totalPlatformFees: 149.5,
        thisMonth: 450.25,
        thisMonthGross: 500.0,
        thisMonthPlatformFees: 49.75,
        availableBalance: 425.3,
        totalSales: 15,
        avgOrderValue: 66.67,
        monthlyGrowth: 25.5,
        last30Days: 650.75,
        last30DaysGross: 750.0,
        last30DaysPlatformFees: 99.25,
        thisMonthSales: 8,
        last30DaysSales: 12,
        pendingPayout: 125.2,
        accountStatus: "Active",
        stripeAccountId: "acct_test456",
      },
    },
    {
      name: "Minimal Sales",
      description: "User with very few sales - should not generate fake historical data",
      data: {
        totalEarnings: 25.5,
        grossSales: 30.0,
        totalPlatformFees: 4.5,
        thisMonth: 25.5,
        thisMonthGross: 30.0,
        thisMonthPlatformFees: 4.5,
        availableBalance: 25.5,
        totalSales: 1,
        avgOrderValue: 30.0,
        monthlyGrowth: 0,
        last30Days: 25.5,
        last30DaysGross: 30.0,
        last30DaysPlatformFees: 4.5,
        thisMonthSales: 1,
        last30DaysSales: 1,
        pendingPayout: 0,
        accountStatus: "Active",
        stripeAccountId: "acct_test789",
      },
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Earnings Data Test Page</h1>
          <p className="text-zinc-400">
            Test different scenarios to verify synthetic data has been removed and proper "no data" states are shown.
          </p>
        </div>

        {/* Test Scenario Selector */}
        <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-white">Test Scenarios</CardTitle>
            <p className="text-sm text-white/70">Select a scenario to test the earnings component behavior</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testScenarios.map((scenario, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-colors ${
                    currentScenario?.name === scenario.name
                      ? "bg-blue-900/30 border-blue-600"
                      : "bg-zinc-800/30 border-zinc-700 hover:border-zinc-600"
                  }`}
                  onClick={() => setCurrentScenario(scenario)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-white">{scenario.name}</h3>
                      {currentScenario?.name === scenario.name && <Badge variant="default">Active</Badge>}
                    </div>
                    <p className="text-sm text-zinc-400">{scenario.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {currentScenario && (
              <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">Current Test Data:</h4>
                <pre className="text-xs text-zinc-300 overflow-x-auto">
                  {JSON.stringify(currentScenario.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clear Test Button */}
        {currentScenario && (
          <div className="mb-6">
            <Button
              onClick={() => setCurrentScenario(null)}
              variant="outline"
              className="border-zinc-700 text-white bg-transparent hover:bg-zinc-800"
            >
              Clear Test
            </Button>
          </div>
        )}

        {/* Earnings Component Test */}
        {currentScenario ? (
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6">
            <div className="mb-4">
              <Badge variant="secondary" className="mb-2">
                Testing: {currentScenario.name}
              </Badge>
              <p className="text-sm text-zinc-400">{currentScenario.description}</p>
            </div>

            <EarningsContent initialData={currentScenario.data} />
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-zinc-700 rounded-lg">
            <div className="text-6xl mb-4">🧪</div>
            <h3 className="text-xl font-medium text-white mb-2">Select a Test Scenario</h3>
            <p className="text-zinc-400">Choose a scenario above to test the earnings component</p>
          </div>
        )}

        {/* Expected Results */}
        <Card className="bg-zinc-900/50 border-zinc-800 mt-8">
          <CardHeader>
            <CardTitle className="text-lg text-white">Expected Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">✅ "No Sales Data" Scenario:</h4>
                <ul className="text-sm text-zinc-400 space-y-1 ml-4">
                  <li>• Revenue Trend chart should show "No Revenue Data" message</li>
                  <li>• Weekly Performance chart should show "No Sales Data" message</li>
                  <li>• All metrics should show $0.00 or 0 values</li>
                  <li>• No synthetic/fake historical data should be generated</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">✅ "With Real Sales" Scenario:</h4>
                <ul className="text-sm text-zinc-400 space-y-1 ml-4">
                  <li>• Charts should display with real data points</li>
                  <li>• All metrics should show actual values from test data</li>
                  <li>• Monthly growth should show 25.5%</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">✅ "Minimal Sales" Scenario:</h4>
                <ul className="text-sm text-zinc-400 space-y-1 ml-4">
                  <li>• Should show real data without fabricating historical trends</li>
                  <li>• Charts should only show actual data points, not synthetic distribution</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
