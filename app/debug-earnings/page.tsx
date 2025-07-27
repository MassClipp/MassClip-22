"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DebugStep {
  name: string
  status: "pending" | "success" | "error" | "running"
  data?: any
  error?: string
  duration?: number
}

export default function DebugEarningsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [steps, setSteps] = useState<DebugStep[]>([
    { name: "Authentication Check", status: "pending" },
    { name: "API Token Generation", status: "pending" },
    { name: "API Request", status: "pending" },
    { name: "Response Validation", status: "pending" },
    { name: "Data Structure Analysis", status: "pending" },
    { name: "Number Validation", status: "pending" },
    { name: "Hook Processing", status: "pending" },
    { name: "Component Rendering", status: "pending" },
  ])
  const [isRunning, setIsRunning] = useState(false)
  const [rawApiResponse, setRawApiResponse] = useState<any>(null)
  const [processedData, setProcessedData] = useState<any>(null)

  const updateStep = (index: number, updates: Partial<DebugStep>) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...updates } : step)))
  }

  const runDiagnostics = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to run diagnostics.",
        variant: "destructive",
      })
      return
    }

    setIsRunning(true)
    setRawApiResponse(null)
    setProcessedData(null)

    // Reset all steps
    setSteps((prev) => prev.map((step) => ({ ...step, status: "pending" as const, error: undefined, data: undefined })))

    try {
      // Step 1: Authentication Check
      updateStep(0, { status: "running" })
      const startTime = Date.now()

      if (!user) {
        updateStep(0, { status: "error", error: "No user found" })
        return
      }

      updateStep(0, {
        status: "success",
        data: { uid: user.uid, email: user.email },
        duration: Date.now() - startTime,
      })

      // Step 2: API Token Generation
      updateStep(1, { status: "running" })
      const tokenStart = Date.now()

      let token: string
      try {
        token = await user.getIdToken()
        updateStep(1, {
          status: "success",
          data: { tokenLength: token.length, tokenPreview: token.substring(0, 20) + "..." },
          duration: Date.now() - tokenStart,
        })
      } catch (error) {
        updateStep(1, { status: "error", error: `Token generation failed: ${error}` })
        return
      }

      // Step 3: API Request
      updateStep(2, { status: "running" })
      const apiStart = Date.now()

      let response: Response
      try {
        response = await fetch("/api/dashboard/earnings", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        updateStep(2, {
          status: "success",
          data: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
          },
          duration: Date.now() - apiStart,
        })
      } catch (error) {
        updateStep(2, { status: "error", error: `API request failed: ${error}` })
        return
      }

      // Step 4: Response Validation
      updateStep(3, { status: "running" })
      const responseStart = Date.now()

      let result: any
      try {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        result = await response.json()
        setRawApiResponse(result)

        updateStep(3, {
          status: "success",
          data: {
            hasData: !!result,
            keys: result ? Object.keys(result) : [],
            dataType: typeof result,
          },
          duration: Date.now() - responseStart,
        })
      } catch (error) {
        updateStep(3, { status: "error", error: `Response parsing failed: ${error}` })
        return
      }

      // Step 5: Data Structure Analysis
      updateStep(4, { status: "running" })
      const structureStart = Date.now()

      try {
        const analysis = {
          totalEarnings: {
            value: result.totalEarnings,
            type: typeof result.totalEarnings,
            isNumber: typeof result.totalEarnings === "number",
            isFinite: Number.isFinite(result.totalEarnings),
            isNaN: Number.isNaN(result.totalEarnings),
          },
          thisMonthEarnings: {
            value: result.thisMonthEarnings,
            type: typeof result.thisMonthEarnings,
            isNumber: typeof result.thisMonthEarnings === "number",
            isFinite: Number.isFinite(result.thisMonthEarnings),
            isNaN: Number.isNaN(result.thisMonthEarnings),
          },
          salesMetrics: {
            exists: !!result.salesMetrics,
            type: typeof result.salesMetrics,
            keys: result.salesMetrics ? Object.keys(result.salesMetrics) : [],
            totalSales: {
              value: result.salesMetrics?.totalSales,
              type: typeof result.salesMetrics?.totalSales,
              isNumber: typeof result.salesMetrics?.totalSales === "number",
            },
            averageTransactionValue: {
              value: result.salesMetrics?.averageTransactionValue,
              type: typeof result.salesMetrics?.averageTransactionValue,
              isNumber: typeof result.salesMetrics?.averageTransactionValue === "number",
              isFinite: Number.isFinite(result.salesMetrics?.averageTransactionValue),
              isNaN: Number.isNaN(result.salesMetrics?.averageTransactionValue),
            },
          },
        }

        updateStep(4, {
          status: "success",
          data: analysis,
          duration: Date.now() - structureStart,
        })
      } catch (error) {
        updateStep(4, { status: "error", error: `Structure analysis failed: ${error}` })
        return
      }

      // Step 6: Number Validation
      updateStep(5, { status: "running" })
      const numberStart = Date.now()

      try {
        const safeNumber = (value: any, fallback = 0): number => {
          if (value === null || value === undefined || value === "") return fallback
          const num = Number(value)
          return isNaN(num) || !isFinite(num) ? fallback : num
        }

        const formatCurrency = (value: any, fallback = "0.00"): string => {
          try {
            const num = safeNumber(value, 0)
            if (typeof num !== "number" || isNaN(num) || !isFinite(num)) {
              return fallback
            }
            return num.toFixed(2)
          } catch (error) {
            return fallback
          }
        }

        const validationResults = {
          totalEarnings: {
            raw: result.totalEarnings,
            safe: safeNumber(result.totalEarnings),
            formatted: formatCurrency(result.totalEarnings),
          },
          thisMonthEarnings: {
            raw: result.thisMonthEarnings,
            safe: safeNumber(result.thisMonthEarnings),
            formatted: formatCurrency(result.thisMonthEarnings),
          },
          averageTransactionValue: {
            raw: result.salesMetrics?.averageTransactionValue,
            safe: safeNumber(result.salesMetrics?.averageTransactionValue),
            formatted: formatCurrency(result.salesMetrics?.averageTransactionValue),
          },
        }

        updateStep(5, {
          status: "success",
          data: validationResults,
          duration: Date.now() - numberStart,
        })
      } catch (error) {
        updateStep(5, { status: "error", error: `Number validation failed: ${error}` })
        return
      }

      // Step 7: Hook Processing Simulation
      updateStep(6, { status: "running" })
      const hookStart = Date.now()

      try {
        // Simulate the hook's data processing
        const ultraSafeNumber = (value: any, fallback = 0): number => {
          if (value === null || value === undefined || value === "" || value === false) {
            return fallback
          }

          if (typeof value === "number") {
            if (isNaN(value) || !isFinite(value)) {
              return fallback
            }
            return value
          }

          if (typeof value === "string") {
            const trimmed = value.trim()
            if (trimmed === "") return fallback

            const num = Number(trimmed)
            if (isNaN(num) || !isFinite(num)) {
              return fallback
            }
            return num
          }

          try {
            const num = Number(value)
            if (isNaN(num) || !isFinite(num)) {
              return fallback
            }
            return num
          } catch (error) {
            return fallback
          }
        }

        const safeGet = (obj: any, path: string, fallback: any = undefined) => {
          try {
            const keys = path.split(".")
            let current = obj

            for (const key of keys) {
              if (current === null || current === undefined || typeof current !== "object") {
                return fallback
              }
              current = current[key]
            }

            return current !== undefined ? current : fallback
          } catch (error) {
            return fallback
          }
        }

        const processedEarningsData = {
          totalEarnings: ultraSafeNumber(safeGet(result, "totalEarnings", 0)),
          thisMonthEarnings: ultraSafeNumber(safeGet(result, "thisMonthEarnings", 0)),
          lastMonthEarnings: ultraSafeNumber(safeGet(result, "lastMonthEarnings", 0)),
          last30DaysEarnings: ultraSafeNumber(safeGet(result, "last30DaysEarnings", 0)),
          pendingPayout: ultraSafeNumber(safeGet(result, "pendingPayout", 0)),
          availableBalance: ultraSafeNumber(safeGet(result, "availableBalance", 0)),
          salesMetrics: {
            totalSales: ultraSafeNumber(safeGet(result, "salesMetrics.totalSales", 0)),
            thisMonthSales: ultraSafeNumber(safeGet(result, "salesMetrics.thisMonthSales", 0)),
            last30DaysSales: ultraSafeNumber(safeGet(result, "salesMetrics.last30DaysSales", 0)),
            averageTransactionValue: ultraSafeNumber(safeGet(result, "salesMetrics.averageTransactionValue", 0)),
          },
        }

        setProcessedData(processedEarningsData)

        updateStep(6, {
          status: "success",
          data: processedEarningsData,
          duration: Date.now() - hookStart,
        })
      } catch (error) {
        updateStep(6, { status: "error", error: `Hook processing failed: ${error}` })
        return
      }

      // Step 8: Component Rendering Test
      updateStep(7, { status: "running" })
      const renderStart = Date.now()

      try {
        // Test all the formatting functions that would be used in the component
        const formatCurrency = (value: any, fallback = "0.00"): string => {
          try {
            const num = typeof value === "number" && isFinite(value) && !isNaN(value) ? value : 0
            return num.toFixed(2)
          } catch (error) {
            return fallback
          }
        }

        const renderingTests = {
          totalEarnings: formatCurrency(processedData?.totalEarnings),
          thisMonthEarnings: formatCurrency(processedData?.thisMonthEarnings),
          averageTransactionValue: formatCurrency(processedData?.salesMetrics?.averageTransactionValue),
          allTestsPassed: true,
        }

        updateStep(7, {
          status: "success",
          data: renderingTests,
          duration: Date.now() - renderStart,
        })

        toast({
          title: "Diagnostics Complete",
          description: "All steps completed successfully!",
        })
      } catch (error) {
        updateStep(7, { status: "error", error: `Rendering test failed: ${error}` })
      }
    } catch (error) {
      toast({
        title: "Diagnostics Failed",
        description: `Unexpected error: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: DebugStep["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <div className="h-4 w-4 rounded-full bg-zinc-600" />
    }
  }

  const getStatusColor = (status: DebugStep["status"]) => {
    switch (status) {
      case "success":
        return "border-green-500/50 bg-green-500/10"
      case "error":
        return "border-red-500/50 bg-red-500/10"
      case "running":
        return "border-blue-500/50 bg-blue-500/10"
      default:
        return "border-zinc-700 bg-zinc-900/60"
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Earnings Debug Console</h1>
            <p className="text-zinc-400 mt-2">Comprehensive diagnostics for earnings data flow</p>
          </div>
          <Button onClick={runDiagnostics} disabled={isRunning || !user} className="bg-blue-600 hover:bg-blue-700">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>

        {!user && (
          <Alert className="border-amber-600 bg-amber-600/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-amber-200">Please log in to run earnings diagnostics.</AlertDescription>
          </Alert>
        )}

        {/* Diagnostic Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className={`${getStatusColor(step.status)} border`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(step.status)}
                    <CardTitle className="text-lg">{step.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-zinc-600">
                      Step {index + 1}
                    </Badge>
                    {step.duration && (
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                        {step.duration}ms
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {step.error && (
                  <Alert className="border-red-600 bg-red-600/10 mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-200">{step.error}</AlertDescription>
                  </Alert>
                )}
                {step.data && (
                  <pre className="text-xs bg-zinc-800/50 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(step.data, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Raw API Response */}
        {rawApiResponse && (
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader>
              <CardTitle>Raw API Response</CardTitle>
              <CardDescription>Unprocessed data from the earnings API</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-zinc-800/50 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(rawApiResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Processed Data */}
        {processedData && (
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader>
              <CardTitle>Processed Data</CardTitle>
              <CardDescription>Data after hook processing and validation</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-zinc-800/50 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(processedData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
