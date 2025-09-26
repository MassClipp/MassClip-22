"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TestResult {
  success: boolean
  message: string
  endDate?: string
  error?: string
  statusCode?: number
  timestamp: string
}

export default function MembershipCancellationTest() {
  const [userId, setUserId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const { toast } = useToast()

  const runCancellationTest = async () => {
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a User ID to test",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    const timestamp = new Date().toISOString()

    try {
      console.log("[v0] Testing membership cancellation for userId:", userId)

      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId.trim(),
        }),
      })

      const data = await response.json()
      console.log("[v0] API Response:", { status: response.status, data })

      const result: TestResult = {
        success: response.ok,
        message: data.message || data.error || "Unknown response",
        endDate: data.endDate,
        error: !response.ok ? data.error : undefined,
        statusCode: response.status,
        timestamp,
      }

      setTestResults((prev) => [result, ...prev])

      if (response.ok) {
        toast({
          title: "Test Successful",
          description: "Membership cancellation API is working correctly",
        })
      } else {
        toast({
          title: "Test Failed",
          description: `API returned error: ${data.error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Test error:", error)
      const result: TestResult = {
        success: false,
        message: "Network or parsing error occurred",
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 0,
        timestamp,
      }

      setTestResults((prev) => [result, ...prev])

      toast({
        title: "Test Error",
        description: "Failed to connect to cancellation API",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-thin bg-gradient-to-r from-slate-300 via-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
            Membership Cancellation Test
          </h1>
          <p className="text-gray-400">
            Test the membership cancellation API to verify it works correctly when users cancel from the app
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Test Configuration</CardTitle>
            <CardDescription className="text-gray-400">
              Enter a User ID to test the membership cancellation flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-white">
                User ID
              </Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter Firebase User ID (e.g., abc123def456...)"
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={runCancellationTest}
                disabled={isLoading}
                className="bg-gradient-to-r from-slate-300 via-cyan-200 to-blue-100 text-black hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Run Cancellation Test"
                )}
              </Button>

              {testResults.length > 0 && (
                <Button
                  onClick={clearResults}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  Clear Results
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Test Results</CardTitle>
              <CardDescription className="text-gray-400">Latest test results (most recent first)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <Badge
                        variant={result.success ? "default" : "destructive"}
                        className={result.success ? "bg-green-600" : "bg-red-600"}
                      >
                        {result.success ? "SUCCESS" : "FAILED"}
                      </Badge>
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        HTTP {result.statusCode}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">{new Date(result.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm text-gray-400">Response Message:</Label>
                      <p className="text-white">{result.message}</p>
                    </div>

                    {result.endDate && (
                      <div>
                        <Label className="text-sm text-gray-400">Access End Date:</Label>
                        <p className="text-green-400">{new Date(result.endDate).toLocaleString()}</p>
                      </div>
                    )}

                    {result.error && (
                      <div>
                        <Label className="text-sm text-gray-400">Error Details:</Label>
                        <p className="text-red-400">{result.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              API Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-white mb-2">Expected Success Response (200):</h4>
                <Textarea
                  readOnly
                  value={JSON.stringify(
                    {
                      success: true,
                      message:
                        "Subscription canceled successfully. Access will continue until the end of your billing period.",
                      endDate: "2024-01-15T10:30:00.000Z",
                    },
                    null,
                    2,
                  )}
                  className="bg-gray-800 border-gray-700 text-green-400 font-mono text-sm"
                  rows={6}
                />
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Common Error Responses:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">400 - Missing User ID:</span>
                    <span className="text-red-400">"User ID is required"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">404 - No Membership:</span>
                    <span className="text-red-400">"No active membership found"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">400 - Already Canceled:</span>
                    <span className="text-red-400">"Subscription is already canceled"</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">What the API Does:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                  <li>Validates user has an active membership in Firebase</li>
                  <li>Retrieves Stripe subscription using stored subscription ID</li>
                  <li>Sets subscription to cancel at period end (not immediate)</li>
                  <li>Updates membership status to "canceled" in Firebase</li>
                  <li>Returns success with access end date</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
