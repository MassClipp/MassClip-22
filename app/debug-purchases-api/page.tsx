"use client"

import { useState } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle, ExternalLink, Copy } from "lucide-react"

interface TestResult {
  name: string
  status: "PASS" | "FAIL"
  message: string
  details: any
}

interface TestResults {
  timestamp: string
  tests: TestResult[]
  summary: {
    passed: number
    failed: number
    total: number
  }
}

export default function DebugPurchasesAPIPage() {
  const { user } = useAuthContext()
  const [results, setResults] = useState<TestResults | null>(null)
  const [loading, setLoading] = useState(false)

  const runTests = async () => {
    setLoading(true)
    setResults(null)

    try {
      const url = user ? `/api/debug/test-purchases-api?userId=${user.uid}` : "/api/debug/test-purchases-api"
      const response = await fetch(url)
      const data = await response.json()
      setResults(data)
    } catch (error: any) {
      console.error("Failed to run tests:", error)
      setResults({
        timestamp: new Date().toISOString(),
        tests: [
          {
            name: "API Connection",
            status: "FAIL",
            message: error.message,
            details: { error: "Failed to connect to test API" },
          },
        ],
        summary: { passed: 0, failed: 1, total: 1 },
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASS":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "FAIL":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASS":
        return "bg-green-500/10 text-green-400 border-green-500/20"
      case "FAIL":
        return "bg-red-500/10 text-red-400 border-red-500/20"
      default:
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Purchases API Debug</h1>
        <p className="text-white/70">Test the purchases API and diagnose issues</p>
      </div>

      {/* User Info */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-sm">Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/70">
            {user ? (
              <div>
                <div>User ID: {user.uid}</div>
                <div>Email: {user.email}</div>
              </div>
            ) : (
              <div>Not logged in</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Run Tests Button */}
      <div className="mb-6">
        <Button onClick={runTests} disabled={loading} className="bg-red-600 hover:bg-red-700">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Run API Tests
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Test Summary
                <div className="flex gap-2">
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    {results.summary.passed} Passed
                  </Badge>
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                    {results.summary.failed} Failed
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-white/70">
                <div>Total Tests: {results.summary.total}</div>
                <div>Timestamp: {new Date(results.timestamp).toLocaleString()}</div>
                <div>Success Rate: {Math.round((results.summary.passed / results.summary.total) * 100)}%</div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Test Results */}
          {results.tests.map((test, index) => (
            <Card key={index} className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    {test.name}
                  </div>
                  <Badge className={getStatusColor(test.status)}>{test.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-white/70">{test.message}</div>

                  {/* Special handling for index errors */}
                  {test.details?.isIndexError && (
                    <Alert className="bg-yellow-500/10 border-yellow-500/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <AlertDescription className="text-yellow-200">
                        <strong>Missing Firestore Index</strong>
                        <div className="mt-2">
                          <p>You need to create this index in Firebase Console:</p>
                          <div className="bg-black/20 p-3 rounded mt-2 font-mono text-sm">
                            Collection: bundlePurchases
                            <br />
                            Fields:
                            <br />
                            &nbsp;&nbsp;• buyerUid (Ascending)
                            <br />
                            &nbsp;&nbsp;• purchasedAt (Descending)
                          </div>
                          {test.details.indexUrl && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="mt-3 bg-transparent border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/10"
                            >
                              <a href={test.details.indexUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Firebase Console
                              </a>
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Details */}
                  {test.details && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white text-sm font-medium">Details</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(test.details, null, 2))}
                          className="text-white/60 hover:text-white"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <pre className="text-xs text-white/60 overflow-auto bg-black/20 p-4 rounded max-h-40">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
