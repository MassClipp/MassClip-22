"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, TestTube } from "lucide-react"

export default function DebugBuyerIdentificationPage() {
  const [testData, setTestData] = useState({
    testBuyerUid: "",
    testProductBoxId: "",
    testSessionId: "",
  })
  const [results, setResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runTest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/debug/buyer-identification-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Test failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTestIcon = (passed: boolean) => {
    return passed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  const getStrengthColor = (strength: string) => {
    const percentage = Number.parseFloat(strength)
    if (percentage >= 75) return "bg-green-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Buyer Identification Debug Tool</h1>
        <p className="text-muted-foreground">
          Test the buyer identification system to ensure proper access control for purchased content.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Parameters
          </CardTitle>
          <CardDescription>
            Enter test data to verify buyer identification across all purchase collections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Buyer UID</label>
            <Input
              placeholder="e.g., user123 or anonymous_email@example.com"
              value={testData.testBuyerUid}
              onChange={(e) => setTestData((prev) => ({ ...prev, testBuyerUid: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Test Product Box ID</label>
            <Input
              placeholder="e.g., productbox123"
              value={testData.testProductBoxId}
              onChange={(e) => setTestData((prev) => ({ ...prev, testProductBoxId: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Test Session ID (Optional)</label>
            <Input
              placeholder="e.g., cs_test_123..."
              value={testData.testSessionId}
              onChange={(e) => setTestData((prev) => ({ ...prev, testSessionId: e.target.value }))}
            />
          </div>
          <Button onClick={runTest} disabled={isLoading || !testData.testBuyerUid}>
            {isLoading ? "Running Tests..." : "Run Buyer Identification Test"}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Test Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{results.summary?.identificationScore}</div>
                  <div className="text-sm text-muted-foreground">Tests Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{results.summary?.totalTests}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="text-center">
                  <Badge className={`${getStrengthColor(results.summary?.identificationStrength || "0%")} text-white`}>
                    {results.summary?.identificationStrength}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">Strength</div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="text-center">
                <p className="font-medium">{results.summary?.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Individual Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
              <CardDescription>Results from each buyer identification method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.tests?.map((test: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                    {getTestIcon(test.passed)}
                    <div className="flex-1">
                      <div className="font-medium capitalize">{test.test.replace(/_/g, " ")}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {test.details || test.error || "Test completed"}
                      </div>
                      {test.count !== undefined && (
                        <div className="text-xs text-muted-foreground mt-1">Records found: {test.count}</div>
                      )}
                      {test.sessionExists !== undefined && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Session exists: {test.sessionExists ? "Yes" : "No"} | Buyer UID matches:{" "}
                          {test.buyerUidMatches ? "Yes" : "No"}
                        </div>
                      )}
                    </div>
                    <Badge variant={test.passed ? "default" : "destructive"}>{test.passed ? "PASS" : "FAIL"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Raw Results */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Test Data</CardTitle>
              <CardDescription>Complete test results for debugging</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">{JSON.stringify(results, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
