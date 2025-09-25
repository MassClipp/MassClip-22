"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LogEntry {
  timestamp: string
  level: "info" | "success" | "error" | "warning"
  message: string
  data?: any
}

interface TestResult {
  step: string
  status: "pending" | "success" | "error" | "skipped"
  message: string
  data?: any
  duration?: number
}

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addLog = (level: LogEntry["level"], message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, { timestamp, level, message, data }])
  }

  const updateTestResult = (
    step: string,
    status: TestResult["status"],
    message: string,
    data?: any,
    duration?: number,
  ) => {
    setTestResults((prev) => {
      const existing = prev.find((r) => r.step === step)
      if (existing) {
        existing.status = status
        existing.message = message
        existing.data = data
        existing.duration = duration
        return [...prev]
      }
      return [...prev, { step, status, message, data, duration }]
    })
  }

  const clearLogs = () => {
    setLogs([])
    setTestResults([])
  }

  const testDirectAPICall = async () => {
    const startTime = Date.now()
    addLog("info", "Testing direct API call to create-bundle-v2...")

    try {
      const testPayload = {
        bundleData: {
          title: "Debug Test Bundle",
          description: "Testing bundle creation from debug page",
          price: 9.99,
          files: [{ name: "test-file.mp4", size: 1024000, type: "video/mp4" }],
        },
      }

      addLog("info", "Making direct POST request", testPayload)

      const response = await fetch("/api/vex/create-bundle-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      })

      const duration = Date.now() - startTime
      addLog("info", `Response received in ${duration}ms`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (response.ok) {
        const data = await response.json()
        addLog("success", "Direct API call successful", data)
        updateTestResult("direct-api", "success", `Success (${duration}ms)`, data, duration)
      } else {
        const errorText = await response.text()
        addLog("error", `Direct API call failed: ${response.status} ${response.statusText}`, errorText)
        updateTestResult(
          "direct-api",
          "error",
          `${response.status}: ${errorText}`,
          { status: response.status, error: errorText },
          duration,
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      addLog("error", "Direct API call threw error", error)
      updateTestResult("direct-api", "error", `Network error: ${error}`, error, duration)
    }
  }

  const testChatRouteCall = async () => {
    const startTime = Date.now()
    addLog("info", "Testing chat route bundle creation...")

    try {
      const testPayload = {
        messages: [
          {
            role: "user",
            content:
              "Create a bundle with title 'Debug Test Bundle' and description 'Testing from debug page' with price 9.99",
          },
        ],
      }

      addLog("info", "Making POST request to chat route", testPayload)

      const response = await fetch("/api/vex/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      })

      const duration = Date.now() - startTime
      addLog("info", `Chat route response received in ${duration}ms`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (response.ok) {
        const data = await response.json()
        addLog("success", "Chat route call successful", data)
        updateTestResult("chat-route", "success", `Success (${duration}ms)`, data, duration)
      } else {
        const errorText = await response.text()
        addLog("error", `Chat route call failed: ${response.status} ${response.statusText}`, errorText)
        updateTestResult(
          "chat-route",
          "error",
          `${response.status}: ${errorText}`,
          { status: response.status, error: errorText },
          duration,
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      addLog("error", "Chat route call threw error", error)
      updateTestResult("chat-route", "error", `Network error: ${error}`, error, duration)
    }
  }

  const testEnvironmentVariables = async () => {
    addLog("info", "Testing environment variables...")

    try {
      const response = await fetch("/api/debug/env", {
        method: "GET",
      })

      if (response.ok) {
        const data = await response.json()
        addLog("success", "Environment variables retrieved", data)
        updateTestResult("env-vars", "success", "Environment variables accessible", data)
      } else {
        addLog("warning", "Could not retrieve environment variables (this is normal for security)")
        updateTestResult("env-vars", "warning", "Environment endpoint not available", null)
      }
    } catch (error) {
      addLog("warning", "Environment test skipped", error)
      updateTestResult("env-vars", "skipped", "Environment test not available", error)
    }
  }

  const testNetworkConnectivity = async () => {
    const startTime = Date.now()
    addLog("info", "Testing network connectivity...")

    try {
      // Test basic connectivity
      const response = await fetch("/api/vex/chat", {
        method: "GET",
      })

      const duration = Date.now() - startTime
      addLog("info", `Network test response: ${response.status} in ${duration}ms`)

      if (response.status === 405) {
        // 405 is expected for GET on POST-only route
        addLog("success", "Network connectivity confirmed (405 expected for GET)")
        updateTestResult("network", "success", "Network connectivity OK", { status: response.status }, duration)
      } else {
        addLog("info", `Unexpected status: ${response.status}`)
        updateTestResult(
          "network",
          "warning",
          `Unexpected status: ${response.status}`,
          { status: response.status },
          duration,
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      addLog("error", "Network connectivity failed", error)
      updateTestResult("network", "error", `Network error: ${error}`, error, duration)
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    clearLogs()

    addLog("info", "Starting comprehensive API debug tests...")

    // Initialize test results
    const steps = ["network", "env-vars", "direct-api", "chat-route"]
    steps.forEach((step) => {
      updateTestResult(step, "pending", "Waiting...", null)
    })

    // Run tests in sequence
    await testNetworkConnectivity()
    await testEnvironmentVariables()
    await testDirectAPICall()
    await testChatRouteCall()

    addLog("info", "All tests completed")
    setIsRunning(false)
  }

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "pending":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "skipped":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getLogColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "success":
        return "text-green-400"
      case "error":
        return "text-red-400"
      case "warning":
        return "text-yellow-400"
      case "info":
        return "text-blue-400"
      default:
        return "text-gray-300"
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-light text-white">API Debug Console</h1>
          <p className="text-gray-400 text-lg">Comprehensive testing of bundle creation API endpoints</p>
        </div>

        {/* Control Panel */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={runAllTests} disabled={isRunning} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isRunning ? "Running Tests..." : "Run All Tests"}
              </Button>
              <Button
                onClick={testDirectAPICall}
                disabled={isRunning}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Test Direct API
              </Button>
              <Button
                onClick={testChatRouteCall}
                disabled={isRunning}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Test Chat Route
              </Button>
              <Button
                onClick={clearLogs}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Clear Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testResults.map((result) => (
                <div key={result.step} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium capitalize">{result.step.replace("-", " ")}</span>
                    <Badge className={getStatusColor(result.status)}>{result.status}</Badge>
                  </div>
                  <div className="text-sm text-gray-400">{result.message}</div>
                  {result.duration && <div className="text-xs text-gray-500">Duration: {result.duration}ms</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Logs */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Live Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No logs yet. Run a test to see detailed output.</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-gray-500 text-xs min-w-[80px]">{log.timestamp}</span>
                      <span className={`text-xs font-semibold min-w-[60px] uppercase ${getLogColor(log.level)}`}>
                        {log.level}
                      </span>
                      <div className="flex-1">
                        <div className="text-gray-300">{log.message}</div>
                        {log.data && (
                          <details className="mt-1">
                            <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-400">
                              Show data
                            </summary>
                            <pre className="text-xs text-gray-400 mt-1 p-2 bg-gray-800/50 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug Information */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Expected Endpoints</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Direct API:</span>
                    <code className="text-green-400">/api/vex/create-bundle-v2</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chat Route:</span>
                    <code className="text-green-400">/api/vex/chat</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Method:</span>
                    <code className="text-blue-400">POST</code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">Common Issues</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>• 405 Error: Route not recognizing POST method</div>
                  <div>• Empty response: Route handler not executing</div>
                  <div>• Network error: Deployment or build issue</div>
                  <div>• Timeout: Route taking too long to respond</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
