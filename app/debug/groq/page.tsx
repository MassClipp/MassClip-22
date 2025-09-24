"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export default function GroqDebugPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState("Hello, can you help me create a bundle?")

  const runTest = async (testName: string, endpoint: string, payload?: any) => {
    setLoading(testName)
    try {
      console.log(`[v0] Running test: ${testName}`)
      const response = await fetch(endpoint, {
        method: payload ? "POST" : "GET",
        headers: payload ? { "Content-Type": "application/json" } : {},
        body: payload ? JSON.stringify(payload) : undefined,
      })

      console.log(`[v0] Response status: ${response.status}`)
      const data = await response.text()
      console.log(`[v0] Response data:`, data)

      setResults((prev) => ({
        ...prev,
        [testName]: {
          status: response.status,
          success: response.ok,
          data: data,
          timestamp: new Date().toISOString(),
        },
      }))
    } catch (error) {
      console.error(`[v0] Test ${testName} failed:`, error)
      setResults((prev) => ({
        ...prev,
        [testName]: {
          status: "ERROR",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
      }))
    } finally {
      setLoading(null)
    }
  }

  const testVexChat = () => {
    runTest("Vex Chat", "/api/vex/chat", {
      messages: [{ role: "user", content: testMessage }],
    })
  }

  const testGroqDirect = () => {
    runTest("Groq Direct Test", "/api/debug/groq-test")
  }

  const testEnvVars = () => {
    runTest("Environment Variables", "/api/debug/env-check")
  }

  const testBundleAnalysis = () => {
    runTest("Bundle Analysis", "/api/debug/bundle-analysis", {
      contentItems: [
        { id: "1", title: "Video Tutorial", contentType: "video", mimeType: "video/mp4", duration: 300 },
        { id: "2", title: "Audio Track", contentType: "audio", mimeType: "audio/mp3", duration: 180 },
      ],
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Groq Integration Debug</h1>
        <p className="text-muted-foreground">Test and debug the Groq API integration</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>Run various tests to identify issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Message:</label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter test message for Vex chat..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Button onClick={testEnvVars} disabled={loading === "Environment Variables"} variant="outline">
                {loading === "Environment Variables" ? "Testing..." : "Test Environment Variables"}
              </Button>

              <Button onClick={testGroqDirect} disabled={loading === "Groq Direct Test"} variant="outline">
                {loading === "Groq Direct Test" ? "Testing..." : "Test Groq Direct"}
              </Button>

              <Button onClick={testVexChat} disabled={loading === "Vex Chat"} variant="outline">
                {loading === "Vex Chat" ? "Testing..." : "Test Vex Chat"}
              </Button>

              <Button onClick={testBundleAnalysis} disabled={loading === "Bundle Analysis"} variant="outline">
                {loading === "Bundle Analysis" ? "Testing..." : "Test Bundle Analysis"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Results from API tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(results).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No tests run yet</p>
              ) : (
                Object.entries(results).map(([testName, result]: [string, any]) => (
                  <div key={testName} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{testName}</h4>
                      <Badge variant={result.success ? "default" : "destructive"}>{result.status}</Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">{result.timestamp}</div>

                    {result.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}

                    {result.data && (
                      <div className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        <pre>
                          {typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
