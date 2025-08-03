"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TestTube, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function DebugPurchasesApiPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runTests = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug/test-purchases-api")
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to run tests")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />
  }

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-300" : "text-red-300"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Debug Purchases API</h1>
        <p className="text-white/70">Test the purchases API and Firebase connection</p>
      </div>

      <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TestTube className="h-5 w-5 mr-2" />
            API Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runTests} disabled={loading} className="bg-red-600 hover:bg-red-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run API Tests
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 mb-6">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-6">
          {/* Overall Status */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                {getStatusIcon(result.overallStatus.success)}
                <span className="ml-2">Overall Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-semibold ${getStatusColor(result.overallStatus.success)}`}>
                {result.overallStatus.message}
              </div>
              <div className="text-sm text-white/60 mt-2">
                {result.overallStatus.totalTests} total tests, {result.overallStatus.failedTests} failed
              </div>
            </CardContent>
          </Card>

          {/* Individual Tests */}
          <div className="grid gap-4">
            {Object.entries(result.tests).map(([testName, testResult]: [string, any]) => (
              <Card key={testName} className="bg-black/40 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center text-base">
                    {getStatusIcon(testResult.success)}
                    <span className="ml-2 capitalize">{testName.replace(/([A-Z])/g, " $1").trim()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-medium ${getStatusColor(testResult.success)}`}>
                    {testResult.message || (testResult.success ? "Test passed" : "Test failed")}
                  </div>

                  {testResult.error && (
                    <div className="mt-2 text-red-300 text-sm">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  )}

                  {testResult.code && (
                    <div className="mt-1 text-red-300 text-sm">
                      <strong>Code:</strong> {testResult.code}
                    </div>
                  )}

                  {testResult.documentCount !== undefined && (
                    <div className="mt-2 text-white/60 text-sm">Documents found: {testResult.documentCount}</div>
                  )}

                  {testResult.collections && (
                    <div className="mt-2">
                      <div className="text-white/60 text-sm mb-1">Available collections:</div>
                      <div className="flex flex-wrap gap-1">
                        {testResult.collections.map((collection: string) => (
                          <span
                            key={collection}
                            className={`px-2 py-1 rounded text-xs ${
                              collection === "bundlePurchases"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-white/10 text-white/60"
                            }`}
                          >
                            {collection}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {testResult.sampleData && (
                    <div className="mt-2">
                      <div className="text-white/60 text-sm mb-1">Sample data:</div>
                      <pre className="bg-black/20 p-2 rounded text-xs text-white/80 overflow-auto">
                        {JSON.stringify(testResult.sampleData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {testResult.indexRequired && (
                    <Alert className="mt-2 bg-yellow-500/10 border-yellow-500/20">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <AlertDescription className="text-yellow-200">
                        <strong>Index Required:</strong> This query needs a Firestore index.{" "}
                        {testResult.indexUrl && (
                          <a
                            href={testResult.indexUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                          >
                            Create index in Firebase Console
                          </a>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Raw Data */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">Raw Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-black/20 p-4 rounded text-xs text-white/80 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
