"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, CheckCircle2, XCircle, Play, PlayCircle, Package, Shield, Smartphone } from "lucide-react"

interface TestSuite {
  id: string
  name: string
  description: string
  file: string
  category: string
}

interface TestResult {
  id: string
  status: "running" | "passed" | "failed" | "idle"
  message?: string
  details?: any
}

export default function TestRunnerPage() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [results, setResults] = useState<Map<string, TestResult>>(new Map())
  const [loading, setLoading] = useState(false)
  const [runningAll, setRunningAll] = useState(false)

  // Load test suites on mount
  useState(() => {
    fetch("/api/playwright/list-tests")
      .then((res) => res.json())
      .then((data) => setTestSuites(data.testSuites))
  })

  const runTest = async (testFile: string, testId: string) => {
    setResults((prev) => new Map(prev).set(testId, { id: testId, status: "running" }))
    setLoading(true)

    try {
      const response = await fetch("/api/playwright/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testFile }),
      })

      const data = await response.json()

      if (data.success) {
        setResults((prev) =>
          new Map(prev).set(testId, {
            id: testId,
            status: "passed",
            message: "All tests passed",
            details: data.results,
          }),
        )
      } else {
        setResults((prev) =>
          new Map(prev).set(testId, {
            id: testId,
            status: "failed",
            message: data.error || "Tests failed",
            details: data,
          }),
        )
      }
    } catch (error) {
      setResults((prev) =>
        new Map(prev).set(testId, {
          id: testId,
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      )
    } finally {
      setLoading(false)
    }
  }

  const runAllTests = async () => {
    setRunningAll(true)
    for (const suite of testSuites) {
      await runTest(suite.file, suite.id)
    }
    setRunningAll(false)
  }

  const getStatusIcon = (status: "running" | "passed" | "failed" | "idle") => {
    switch (status) {
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <PlayCircle className="h-5 w-5 text-zinc-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "flows":
        return <Package className="h-5 w-5" />
      case "permissions":
        return <Shield className="h-5 w-5" />
      case "mobile":
        return <Smartphone className="h-5 w-5" />
      default:
        return <PlayCircle className="h-5 w-5" />
    }
  }

  const flowTests = testSuites.filter((t) => t.category === "flows")
  const permissionTests = testSuites.filter((t) => t.category === "permissions")
  const mobileTests = testSuites.filter((t) => t.category === "mobile")

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Automated Test Runner</h1>
          <p className="text-sm md:text-base text-zinc-400">
            Run end-to-end tests and verify permissions without using the terminal
          </p>
        </div>

        {/* Run All Button */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-zinc-400">Run all tests or select individual suites below</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runAllTests}
              disabled={runningAll || loading}
              className="w-full bg-white text-black hover:bg-zinc-200"
              size="lg"
            >
              {runningAll ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Running All Tests...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Suites by Category */}
        <Tabs defaultValue="flows" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
            <TabsTrigger value="flows" className="data-[state=active]:bg-zinc-800">
              <Package className="h-4 w-4 mr-2" />
              User Flows
            </TabsTrigger>
            <TabsTrigger value="permissions" className="data-[state=active]:bg-zinc-800">
              <Shield className="h-4 w-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="mobile" className="data-[state=active]:bg-zinc-800">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flows" className="space-y-4 mt-4">
            {flowTests.map((suite) => {
              const result = results.get(suite.id)
              return (
                <Card key={suite.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {result && getStatusIcon(result.status)}
                          <CardTitle className="text-white text-lg">{suite.name}</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-400">{suite.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => runTest(suite.file, suite.id)}
                        disabled={loading || result?.status === "running"}
                        variant="outline"
                        className="shrink-0"
                      >
                        {result?.status === "running" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {result && result.status !== "idle" && result.status !== "running" && (
                    <CardContent>
                      <div
                        className={`p-3 rounded-lg ${
                          result.status === "passed"
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-red-500/10 border border-red-500/20"
                        }`}
                      >
                        <p className={`text-sm ${result.status === "passed" ? "text-green-500" : "text-red-500"}`}>
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-300">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-black rounded text-xs overflow-x-auto text-zinc-400">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            {permissionTests.map((suite) => {
              const result = results.get(suite.id)
              return (
                <Card key={suite.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {result && getStatusIcon(result.status)}
                          <CardTitle className="text-white text-lg">{suite.name}</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-400">{suite.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => runTest(suite.file, suite.id)}
                        disabled={loading || result?.status === "running"}
                        variant="outline"
                        className="shrink-0"
                      >
                        {result?.status === "running" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {result && result.status !== "idle" && result.status !== "running" && (
                    <CardContent>
                      <div
                        className={`p-3 rounded-lg ${
                          result.status === "passed"
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-red-500/10 border border-red-500/20"
                        }`}
                      >
                        <p className={`text-sm ${result.status === "passed" ? "text-green-500" : "text-red-500"}`}>
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-300">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-black rounded text-xs overflow-x-auto text-zinc-400">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="mobile" className="space-y-4 mt-4">
            {mobileTests.map((suite) => {
              const result = results.get(suite.id)
              return (
                <Card key={suite.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {result && getStatusIcon(result.status)}
                          <CardTitle className="text-white text-lg">{suite.name}</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-400">{suite.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => runTest(suite.file, suite.id)}
                        disabled={loading || result?.status === "running"}
                        variant="outline"
                        className="shrink-0"
                      >
                        {result?.status === "running" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {result && result.status !== "idle" && result.status !== "running" && (
                    <CardContent>
                      <div
                        className={`p-3 rounded-lg ${
                          result.status === "passed"
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-red-500/10 border border-red-500/20"
                        }`}
                      >
                        <p className={`text-sm ${result.status === "passed" ? "text-green-500" : "text-red-500"}`}>
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-300">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-black rounded text-xs overflow-x-auto text-zinc-400">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </TabsContent>
        </Tabs>

        {/* Summary */}
        {results.size > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-500">
                    {Array.from(results.values()).filter((r) => r.status === "passed").length}
                  </div>
                  <div className="text-sm text-zinc-400">Passed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-500">
                    {Array.from(results.values()).filter((r) => r.status === "failed").length}
                  </div>
                  <div className="text-sm text-zinc-400">Failed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-500">
                    {Array.from(results.values()).filter((r) => r.status === "running").length}
                  </div>
                  <div className="text-sm text-zinc-400">Running</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
