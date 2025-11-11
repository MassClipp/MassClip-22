"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, CheckCircle2, XCircle, Play, Shield, Lock, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

interface TestSummary {
  total: number
  passed: number
  failed: number
  passRate: number
}

type TestCategory = "all" | "permissions" | "auth" | "uploads"

export default function TestRunnerPage() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [summary, setSummary] = useState<TestSummary | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())

  const runTests = async (testType: TestCategory) => {
    setRunning(true)
    setResults([])
    setSummary(null)
    setExpandedResults(new Set())

    try {
      const response = await fetch("/api/test-system/run-permission-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType }),
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setSummary(data.summary)
      } else {
        setResults([
          {
            name: "Test System Error",
            passed: false,
            message: data.error || "Failed to run tests",
          },
        ])
      }
    } catch (error: any) {
      setResults([
        {
          name: "Test System Error",
          passed: false,
          message: error.message,
        },
      ])
    } finally {
      setRunning(false)
    }
  }

  const toggleDetails = (index: number) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const permissionResults = results.filter(
    (r) =>
      r.name.includes("Bundle") ||
      r.name.includes("Video") ||
      r.name.includes("Platform") ||
      r.name.includes("Download"),
  )
  const authResults = results.filter((r) => r.name.includes("Auth"))
  const uploadResults = results.filter((r) => r.name.includes("Upload"))

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Test Runner</h1>
          <p className="text-sm md:text-base text-zinc-400">
            Automated testing system for permissions, authentication, and core functionality
          </p>
        </div>

        {/* Summary Card */}
        {summary && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Test Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{summary.total}</div>
                  <div className="text-sm text-zinc-400">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">{summary.passed}</div>
                  <div className="text-sm text-zinc-400">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500">{summary.failed}</div>
                  <div className="text-sm text-zinc-400">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{summary.passRate.toFixed(1)}%</div>
                  <div className="text-sm text-zinc-400">Pass Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run All Tests Button */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-zinc-400">
              Run all tests or select individual categories below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => runTests("all")}
              disabled={running}
              size="lg"
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Run All Tests
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Categories */}
        <Tabs defaultValue="permissions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
            <TabsTrigger value="permissions" className="data-[state=active]:bg-zinc-800">
              <Shield className="mr-2 h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="auth" className="data-[state=active]:bg-zinc-800">
              <Lock className="mr-2 h-4 w-4" />
              Authentication
            </TabsTrigger>
            <TabsTrigger value="uploads" className="data-[state=active]:bg-zinc-800">
              <Upload className="mr-2 h-4 w-4" />
              Uploads
            </TabsTrigger>
          </TabsList>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4 mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Plan Permission Tests</CardTitle>
                <CardDescription className="text-zinc-400">
                  Validates that each plan (Free, Starter, Faceless Pro, Facelessprenuer) has the correct permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTests("permissions")}
                  disabled={running}
                  className="mb-4 bg-white text-black hover:bg-zinc-200"
                >
                  {running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Permission Tests
                    </>
                  )}
                </Button>

                <div className="space-y-3">
                  {permissionResults.map((result, idx) => (
                    <TestResultCard
                      key={idx}
                      result={result}
                      isExpanded={expandedResults.has(idx)}
                      onToggle={() => toggleDetails(idx)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auth Tab */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Authentication Tests</CardTitle>
                <CardDescription className="text-zinc-400">
                  Tests authentication endpoints and user management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTests("auth")}
                  disabled={running}
                  className="mb-4 bg-white text-black hover:bg-zinc-200"
                >
                  {running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Auth Tests
                    </>
                  )}
                </Button>

                <div className="space-y-3">
                  {authResults.map((result, idx) => (
                    <TestResultCard
                      key={idx}
                      result={result}
                      isExpanded={expandedResults.has(idx + 1000)}
                      onToggle={() => toggleDetails(idx + 1000)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Uploads Tab */}
          <TabsContent value="uploads" className="space-y-4 mt-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Upload Tests</CardTitle>
                <CardDescription className="text-zinc-400">
                  Tests file upload functionality and API endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => runTests("uploads")}
                  disabled={running}
                  className="mb-4 bg-white text-black hover:bg-zinc-200"
                >
                  {running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Upload Tests
                    </>
                  )}
                </Button>

                <div className="space-y-3">
                  {uploadResults.map((result, idx) => (
                    <TestResultCard
                      key={idx}
                      result={result}
                      isExpanded={expandedResults.has(idx + 2000)}
                      onToggle={() => toggleDetails(idx + 2000)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function TestResultCard({
  result,
  isExpanded,
  onToggle,
}: {
  result: TestResult
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Card className={`${result.passed ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {result.passed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium mb-1 text-white">{result.name}</div>
              <div className="text-sm text-zinc-400">{result.message}</div>
              {result.details && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="mt-2 h-auto py-1 px-2 text-xs text-zinc-400 hover:text-white"
                >
                  {isExpanded ? "Hide" : "Show"} Details
                </Button>
              )}
              {isExpanded && result.details && (
                <pre className="mt-2 p-3 bg-black rounded text-xs overflow-auto text-zinc-400">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          </div>
          <Badge variant={result.passed ? "default" : "destructive"} className="flex-shrink-0">
            {result.passed ? "PASS" : "FAIL"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
