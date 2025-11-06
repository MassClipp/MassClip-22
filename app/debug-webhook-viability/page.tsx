"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Webhook,
  Server,
  Database,
  Key,
  Globe,
  Clock,
  Bug,
} from "lucide-react"

interface TestResult {
  name: string
  status: "success" | "error" | "warning" | "pending"
  message: string
  details?: any
  duration?: number
}

interface WebhookTest {
  endpoint: string
  method: string
  headers: Record<string, string>
  body: string
  expectedStatus: number
}

export default function WebhookViabilityTestPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string>("all")

  const updateResult = (
    name: string,
    status: TestResult["status"],
    message: string,
    details?: any,
    duration?: number,
  ) => {
    setResults((prev) => {
      const existing = prev.find((r) => r.name === name)
      const newResult = { name, status, message, details, duration }
      if (existing) {
        return prev.map((r) => (r.name === name ? newResult : r))
      }
      return [...prev, newResult]
    })
  }

  const testEnvironmentVariables = async () => {
    const startTime = Date.now()
    updateResult("Environment Variables", "pending", "Checking environment variables...")

    try {
      const response = await fetch("/api/debug/webhook-environment-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      if (response.ok) {
        const issues = []
        if (!data.hasStripeSecret) issues.push("Missing STRIPE_SECRET_KEY")
        if (!data.hasWebhookSecret) issues.push("Missing STRIPE_WEBHOOK_SECRET")
        if (data.webhookSecretLength < 20) issues.push("Webhook secret too short")

        if (issues.length === 0) {
          updateResult(
            "Environment Variables",
            "success",
            "All environment variables configured correctly",
            data,
            duration,
          )
        } else {
          updateResult("Environment Variables", "error", `Issues found: ${issues.join(", ")}`, data, duration)
        }
      } else {
        updateResult("Environment Variables", "error", data.error || "Failed to check environment", data, duration)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateResult(
        "Environment Variables",
        "error",
        `Request failed: ${error.message}`,
        { error: error.message },
        duration,
      )
    }
  }

  const testWebhookEndpoint = async () => {
    const startTime = Date.now()
    updateResult("Webhook Endpoint", "pending", "Testing webhook endpoint accessibility...")

    try {
      // Test if the endpoint is accessible
      const response = await fetch("/api/webhooks/stripe", {
        method: "GET", // Just test if endpoint exists
      })

      const duration = Date.now() - startTime

      // Webhook should return 405 for GET requests (Method Not Allowed)
      if (response.status === 405) {
        updateResult(
          "Webhook Endpoint",
          "success",
          "Webhook endpoint is accessible and properly configured",
          {
            status: response.status,
            statusText: response.statusText,
          },
          duration,
        )
      } else {
        updateResult(
          "Webhook Endpoint",
          "warning",
          `Unexpected response: ${response.status}`,
          {
            status: response.status,
            statusText: response.statusText,
          },
          duration,
        )
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateResult(
        "Webhook Endpoint",
        "error",
        `Endpoint not accessible: ${error.message}`,
        { error: error.message },
        duration,
      )
    }
  }

  const testWebhookSignature = async () => {
    const startTime = Date.now()
    updateResult("Webhook Signature", "pending", "Testing webhook signature verification...")

    try {
      const response = await fetch("/api/debug/test-webhook-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      if (response.ok) {
        updateResult("Webhook Signature", "success", "Webhook signature verification working", data, duration)
      } else {
        updateResult("Webhook Signature", "error", data.error || "Signature verification failed", data, duration)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateResult("Webhook Signature", "error", `Request failed: ${error.message}`, { error: error.message }, duration)
    }
  }

  const testDatabaseConnection = async () => {
    const startTime = Date.now()
    updateResult("Database Connection", "pending", "Testing Firebase connection...")

    try {
      const response = await fetch("/api/debug/firebase-admin-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      if (response.ok && data.success) {
        updateResult("Database Connection", "success", "Firebase connection working", data, duration)
      } else {
        updateResult("Database Connection", "error", data.error || "Database connection failed", data, duration)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateResult(
        "Database Connection",
        "error",
        `Request failed: ${error.message}`,
        { error: error.message },
        duration,
      )
    }
  }

  const testStripeConnection = async () => {
    const startTime = Date.now()
    updateResult("Stripe Connection", "pending", "Testing Stripe API connection...")

    try {
      const response = await fetch("/api/debug/stripe-api-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      if (response.ok && data.success) {
        updateResult("Stripe Connection", "success", "Stripe API connection working", data, duration)
      } else {
        updateResult("Stripe Connection", "error", data.error || "Stripe connection failed", data, duration)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateResult("Stripe Connection", "error", `Request failed: ${error.message}`, { error: error.message }, duration)
    }
  }

  const simulateWebhookEvent = async () => {
    const startTime = Date.now()
    updateResult("Webhook Simulation", "pending", "Simulating checkout.session.completed event...")

    try {
      const response = await fetch("/api/debug/simulate-webhook-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "checkout.session.completed",
          testMode: true,
        }),
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      if (response.ok && data.success) {
        updateResult("Webhook Simulation", "success", "Webhook simulation completed successfully", data, duration)
      } else {
        updateResult("Webhook Simulation", "error", data.error || "Webhook simulation failed", data, duration)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateResult(
        "Webhook Simulation",
        "error",
        `Request failed: ${error.message}`,
        { error: error.message },
        duration,
      )
    }
  }

  const runAllTests = async () => {
    setLoading(true)
    setResults([])

    try {
      await testEnvironmentVariables()
      await testWebhookEndpoint()
      await testDatabaseConnection()
      await testStripeConnection()
      await testWebhookSignature()
      await simulateWebhookEvent()
    } finally {
      setLoading(false)
    }
  }

  const runSingleTest = async (testName: string) => {
    setLoading(true)

    try {
      switch (testName) {
        case "environment":
          await testEnvironmentVariables()
          break
        case "endpoint":
          await testWebhookEndpoint()
          break
        case "database":
          await testDatabaseConnection()
          break
        case "stripe":
          await testStripeConnection()
          break
        case "signature":
          await testWebhookSignature()
          break
        case "simulation":
          await simulateWebhookEvent()
          break
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "pending":
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
    }
  }

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      case "warning":
        return "bg-yellow-50 border-yellow-200"
      case "pending":
        return "bg-blue-50 border-blue-200"
    }
  }

  const successCount = results.filter((r) => r.status === "success").length
  const errorCount = results.filter((r) => r.status === "error").length
  const warningCount = results.filter((r) => r.status === "warning").length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-6 w-6" />
                Webhook Viability Testing
              </CardTitle>
              <CardDescription>
                Comprehensive testing suite to diagnose webhook issues and ensure proper functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <Button onClick={runAllTests} disabled={loading} size="lg">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Run All Tests
                </Button>

                {results.length > 0 && (
                  <div className="flex gap-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ {successCount} Passed
                    </Badge>
                    {warningCount > 0 && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        ⚠ {warningCount} Warnings
                      </Badge>
                    )}
                    {errorCount > 0 && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        ✗ {errorCount} Failed
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="individual">Individual Tests</TabsTrigger>
              <TabsTrigger value="details">Detailed Results</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Environment Variables", icon: Key, test: "environment" },
                  { name: "Webhook Endpoint", icon: Globe, test: "endpoint" },
                  { name: "Database Connection", icon: Database, test: "database" },
                  { name: "Stripe Connection", icon: Server, test: "stripe" },
                  { name: "Webhook Signature", icon: Bug, test: "signature" },
                  { name: "Webhook Simulation", icon: Clock, test: "simulation" },
                ].map(({ name, icon: Icon, test }) => {
                  const result = results.find((r) => r.name === name)
                  return (
                    <Card key={name} className={result ? getStatusColor(result.status) : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-gray-600" />
                            <span className="font-medium">{name}</span>
                          </div>
                          {result && getStatusIcon(result.status)}
                        </div>
                        {result && <p className="text-sm text-gray-600 mt-2">{result.message}</p>}
                        {result?.duration && <p className="text-xs text-gray-500 mt-1">{result.duration}ms</p>}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { name: "Environment", test: "environment" },
                  { name: "Endpoint", test: "endpoint" },
                  { name: "Database", test: "database" },
                  { name: "Stripe", test: "stripe" },
                  { name: "Signature", test: "signature" },
                  { name: "Simulation", test: "simulation" },
                ].map(({ name, test }) => (
                  <Button
                    key={test}
                    variant="outline"
                    onClick={() => runSingleTest(test)}
                    disabled={loading}
                    className="w-full"
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {results.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>No test results yet. Run some tests to see detailed results here.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <Card key={index} className={getStatusColor(result.status)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            {result.name}
                          </CardTitle>
                          {result.duration && <Badge variant="outline">{result.duration}ms</Badge>}
                        </div>
                        <CardDescription>{result.message}</CardDescription>
                      </CardHeader>
                      {result.details && (
                        <CardContent className="pt-0">
                          <Separator className="mb-3" />
                          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
