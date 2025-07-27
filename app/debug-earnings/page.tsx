"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Bug, Database, User, DollarSign, AlertTriangle } from "lucide-react"

interface DebugData {
  step: string
  status: "loading" | "success" | "error"
  data?: any
  error?: string
  timestamp: Date
}

export default function EarningsDebugPage() {
  const { user } = useAuth()
  const [debugSteps, setDebugSteps] = useState<DebugData[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [rawApiResponse, setRawApiResponse] = useState<any>(null)

  const addDebugStep = (step: string, status: DebugData["status"], data?: any, error?: string) => {
    setDebugSteps((prev) => [
      ...prev,
      {
        step,
        status,
        data,
        error,
        timestamp: new Date(),
      },
    ])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setDebugSteps([])
    setRawApiResponse(null)

    // Step 1: Check user authentication
    addDebugStep("User Authentication", "loading")

    if (!user) {
      addDebugStep("User Authentication", "error", null, "User not authenticated")
      setIsRunning(false)
      return
    }

    try {
      const token = await user.getIdToken()
      addDebugStep("User Authentication", "success", {
        uid: user.uid,
        email: user.email,
        hasToken: !!token,
      })
    } catch (error) {
      addDebugStep("User Authentication", "error", null, `Failed to get token: ${error}`)
      setIsRunning(false)
      return
    }

    // Step 2: Test API endpoint directly
    addDebugStep("API Request", "loading")

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const responseData = await response.json()
      setRawApiResponse(responseData)

      if (!response.ok) {
        addDebugStep("API Request", "error", responseData, `HTTP ${response.status}: ${response.statusText}`)
      } else {
        addDebugStep("API Request", "success", {
          status: response.status,
          dataKeys: Object.keys(responseData),
          hasRequiredFields: {
            totalEarnings: responseData.hasOwnProperty("totalEarnings"),
            salesMetrics: responseData.hasOwnProperty("salesMetrics"),
            accountStatus: responseData.hasOwnProperty("accountStatus"),
          },
        })
      }
    } catch (error) {
      addDebugStep("API Request", "error", null, `Network error: ${error}`)
    }

    // Step 3: Validate data types
    addDebugStep("Data Validation", "loading")

    if (rawApiResponse) {
      const validationResults = {
        totalEarnings: {
          value: rawApiResponse.totalEarnings,
          type: typeof rawApiResponse.totalEarnings,
          isNumber: !isNaN(Number(rawApiResponse.totalEarnings)),
          canCallToFixed:
            typeof rawApiResponse.totalEarnings === "number" || !isNaN(Number(rawApiResponse.totalEarnings)),
        },
        thisMonthEarnings: {
          value: rawApiResponse.thisMonthEarnings,
          type: typeof rawApiResponse.thisMonthEarnings,
          isNumber: !isNaN(Number(rawApiResponse.thisMonthEarnings)),
          canCallToFixed:
            typeof rawApiResponse.thisMonthEarnings === "number" || !isNaN(Number(rawApiResponse.thisMonthEarnings)),
        },
        salesMetrics: {
          exists: !!rawApiResponse.salesMetrics,
          totalSales: {
            value: rawApiResponse.salesMetrics?.totalSales,
            type: typeof rawApiResponse.salesMetrics?.totalSales,
            isNumber: !isNaN(Number(rawApiResponse.salesMetrics?.totalSales)),
          },
          averageTransactionValue: {
            value: rawApiResponse.salesMetrics?.averageTransactionValue,
            type: typeof rawApiResponse.salesMetrics?.averageTransactionValue,
            isNumber: !isNaN(Number(rawApiResponse.salesMetrics?.averageTransactionValue)),
          },
        },
      }

      const hasValidationErrors =
        !validationResults.totalEarnings.canCallToFixed ||
        !validationResults.thisMonthEarnings.canCallToFixed ||
        !validationResults.salesMetrics.totalSales.isNumber

      addDebugStep(
        "Data Validation",
        hasValidationErrors ? "error" : "success",
        validationResults,
        hasValidationErrors ? "Some values cannot be safely converted to numbers" : undefined,
      )
    }

    // Step 4: Test useStripeEarnings hook simulation
    addDebugStep("Hook Simulation", "loading")

    try {
      // Simulate the hook's data processing
      const safeNumber = (value: any): number => {
        if (value === null || value === undefined) return 0
        const num = Number(value)
        return isNaN(num) ? 0 : num
      }

      const processedData = rawApiResponse
        ? {
            totalEarnings: safeNumber(rawApiResponse.totalEarnings),
            thisMonthEarnings: safeNumber(rawApiResponse.thisMonthEarnings),
            lastMonthEarnings: safeNumber(rawApiResponse.lastMonthEarnings),
            last30DaysEarnings: safeNumber(rawApiResponse.last30DaysEarnings),
            salesMetrics: {
              totalSales: safeNumber(rawApiResponse.salesMetrics?.totalSales),
              thisMonthSales: safeNumber(rawApiResponse.salesMetrics?.thisMonthSales),
              last30DaysSales: safeNumber(rawApiResponse.salesMetrics?.last30DaysSales),
              averageTransactionValue: safeNumber(rawApiResponse.salesMetrics?.averageTransactionValue),
            },
          }
        : null

      addDebugStep("Hook Simulation", "success", {
        processed: processedData,
        canCallToFixed: processedData
          ? {
              totalEarnings: typeof processedData.totalEarnings === "number",
              thisMonthEarnings: typeof processedData.thisMonthEarnings === "number",
              averageTransactionValue: typeof processedData.salesMetrics.averageTransactionValue === "number",
            }
          : null,
      })
    } catch (error) {
      addDebugStep("Hook Simulation", "error", null, `Processing error: ${error}`)
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: DebugData["status"]) => {
    switch (status) {
      case "success":
        return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case "error":
        return <div className="w-2 h-2 bg-red-500 rounded-full" />
      case "loading":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    }
  }

  const getStatusBadge = (status: DebugData["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "loading":
        return <Badge variant="secondary">Loading...</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Earnings Debug Console</h1>
          <p className="text-zinc-400 mt-1">Diagnose earnings data flow and identify issues</p>
        </div>
        <Button onClick={runDiagnostics} disabled={isRunning || !user} className="bg-blue-600 hover:bg-blue-700">
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Bug className="h-4 w-4 mr-2" />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      {!user && (
        <Alert className="border-amber-600 bg-amber-600/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-amber-200">Please log in to run earnings diagnostics</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="diagnostics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="diagnostics">Diagnostic Steps</TabsTrigger>
          <TabsTrigger value="raw-data">Raw API Response</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Diagnostic Steps
              </CardTitle>
              <CardDescription>Step-by-step analysis of the earnings data flow</CardDescription>
            </CardHeader>
            <CardContent>
              {debugSteps.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  Click "Run Diagnostics" to start analyzing the earnings data flow
                </div>
              ) : (
                <div className="space-y-4">
                  {debugSteps.map((step, index) => (
                    <div key={index} className="border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(step.status)}
                          <h3 className="font-medium text-white">{step.step}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(step.status)}
                          <span className="text-xs text-zinc-500">{step.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {step.error && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-800/50 rounded text-red-300 text-sm">
                          {step.error}
                        </div>
                      )}

                      {step.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300 text-sm">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-zinc-800 rounded text-xs text-zinc-300 overflow-auto">
                            {JSON.stringify(step.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-data">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Raw API Response
              </CardTitle>
              <CardDescription>Unprocessed data from the earnings API endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              {rawApiResponse ? (
                <pre className="p-4 bg-zinc-800 rounded text-sm text-zinc-300 overflow-auto max-h-96">
                  {JSON.stringify(rawApiResponse, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No API response data available. Run diagnostics first.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Recommendations
              </CardTitle>
              <CardDescription>Suggested fixes based on diagnostic results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-white">Common Issues & Solutions:</h4>

                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <h5 className="font-medium text-zinc-300 mb-1">
                    TypeError: Cannot read properties of undefined (reading 'toFixed')
                  </h5>
                  <p className="text-sm text-zinc-400 mb-2">
                    This occurs when trying to call .toFixed() on undefined or null values.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Solution: Ensure all numeric values are properly validated before formatting.
                  </p>
                </div>

                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <h5 className="font-medium text-zinc-300 mb-1">Missing Stripe Account</h5>
                  <p className="text-sm text-zinc-400 mb-2">
                    User doesn't have a connected Stripe account for earnings tracking.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Solution: Redirect to Stripe Connect setup or show appropriate message.
                  </p>
                </div>

                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <h5 className="font-medium text-zinc-300 mb-1">API Response Structure Issues</h5>
                  <p className="text-sm text-zinc-400 mb-2">
                    The API response doesn't match the expected data structure.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Solution: Implement proper data validation and default values in the API.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
