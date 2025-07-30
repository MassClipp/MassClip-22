"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"

interface DebugStep {
  name: string
  status: "pending" | "running" | "success" | "error"
  data?: any
  error?: string
  timestamp?: string
}

export default function DebugPurchaseFlowPage() {
  const [sessionId, setSessionId] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<DebugStep[]>([])
  const [finalResponse, setFinalResponse] = useState<any>(null)

  const updateStep = (stepName: string, status: DebugStep["status"], data?: any, error?: string) => {
    setSteps((prev) => {
      const existing = prev.find((s) => s.name === stepName)
      if (existing) {
        existing.status = status
        existing.data = data
        existing.error = error
        existing.timestamp = new Date().toISOString()
        return [...prev]
      } else {
        return [
          ...prev,
          {
            name: stepName,
            status,
            data,
            error,
            timestamp: new Date().toISOString(),
          },
        ]
      }
    })
  }

  const debugPurchaseFlow = async () => {
    if (!sessionId.trim()) {
      alert("Please enter a session ID")
      return
    }

    setIsRunning(true)
    setSteps([])
    setFinalResponse(null)

    try {
      // Step 1: Extract session ID
      updateStep("Extract Session ID", "running")
      await new Promise((resolve) => setTimeout(resolve, 500))
      updateStep("Extract Session ID", "success", { sessionId: sessionId.trim() })

      // Step 2: Get auth token
      updateStep("Get Auth Token", "running")
      let token = null
      try {
        // Try to get Firebase auth token if user is logged in
        const { getAuth } = await import("firebase/auth")
        const auth = getAuth()
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken(true)
          updateStep("Get Auth Token", "success", { hasToken: true, userId: auth.currentUser.uid })
        } else {
          updateStep("Get Auth Token", "success", { hasToken: false, message: "No authenticated user" })
        }
      } catch (error: any) {
        updateStep("Get Auth Token", "error", null, error.message)
      }

      // Step 3: Call verification API
      updateStep("Call Verification API", "running")
      const requestBody = { sessionId: sessionId.trim() }
      if (token) {
        requestBody.idToken = token
      }

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()

      if (response.ok) {
        updateStep("Call Verification API", "success", {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          responseSize: JSON.stringify(responseData).length,
        })
      } else {
        updateStep("Call Verification API", "error", responseData, `HTTP ${response.status}`)
        setFinalResponse(responseData)
        setIsRunning(false)
        return
      }

      // Step 4: Parse response
      updateStep("Parse Response", "running")
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (responseData.success) {
        updateStep("Parse Response", "success", {
          success: responseData.success,
          alreadyProcessed: responseData.alreadyProcessed,
          hasSession: !!responseData.session,
          hasPurchase: !!responseData.purchase,
          hasItem: !!responseData.item,
        })
      } else {
        updateStep("Parse Response", "error", responseData, responseData.error || "Unknown error")
        setFinalResponse(responseData)
        setIsRunning(false)
        return
      }

      // Step 5: Validate session data
      updateStep("Validate Session Data", "running")
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (responseData.session) {
        const sessionData = responseData.session
        updateStep("Validate Session Data", "success", {
          sessionId: sessionData.id,
          amount: sessionData.amount,
          currency: sessionData.currency,
          paymentStatus: sessionData.payment_status || sessionData.status,
          customerEmail: sessionData.customerEmail,
          connectedAccount: sessionData.connectedAccount,
          retrievalMethod: sessionData.retrievalMethod,
        })
      } else {
        updateStep("Validate Session Data", "error", null, "No session data in response")
      }

      // Step 6: Validate bundle data
      updateStep("Validate Bundle Data", "running")
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (responseData.item) {
        const itemData = responseData.item
        const validation = {
          hasId: !!itemData.id,
          hasTitle: !!itemData.title,
          hasDescription: !!itemData.description,
          hasPrice: typeof itemData.price === "number",
          hasThumbnail: !!itemData.thumbnailUrl,
          hasDownloadUrl: !!itemData.downloadUrl,
          hasCreator: !!itemData.creator,
          creatorName: itemData.creator?.name,
          creatorUsername: itemData.creator?.username,
          fileSize: itemData.fileSize,
          fileType: itemData.fileType,
          tags: itemData.tags,
        }

        const missingFields = []
        if (!validation.hasId) missingFields.push("id")
        if (!validation.hasTitle) missingFields.push("title")
        if (!validation.hasDownloadUrl) missingFields.push("downloadUrl")
        if (!validation.hasCreator) missingFields.push("creator")

        if (missingFields.length === 0) {
          updateStep("Validate Bundle Data", "success", validation)
        } else {
          updateStep("Validate Bundle Data", "error", validation, `Missing fields: ${missingFields.join(", ")}`)
        }
      } else {
        updateStep("Validate Bundle Data", "error", null, "No item data in response")
      }

      // Step 7: Test bundle access
      updateStep("Test Bundle Access", "running")
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (responseData.item?.id) {
        try {
          const bundleId = responseData.item.id
          const accessResponse = await fetch(`/api/product-box/${bundleId}/content`, {
            method: "GET",
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          })

          if (accessResponse.ok) {
            updateStep("Test Bundle Access", "success", {
              bundleId,
              accessStatus: accessResponse.status,
              canAccess: true,
            })
          } else {
            const accessError = await accessResponse.json()
            updateStep(
              "Test Bundle Access",
              "error",
              { bundleId, accessStatus: accessResponse.status },
              accessError.error || "Access denied",
            )
          }
        } catch (error: any) {
          updateStep("Test Bundle Access", "error", null, error.message)
        }
      } else {
        updateStep("Test Bundle Access", "error", null, "No bundle ID to test")
      }

      setFinalResponse(responseData)
    } catch (error: any) {
      updateStep("Debug Flow", "error", null, error.message)
    } finally {
      setIsRunning(false)
    }
  }

  const getStepIcon = (status: DebugStep["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepBadge = (status: DebugStep["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Success
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "running":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Running
          </Badge>
        )
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Purchase Flow Debug Tool</h1>
        <p className="text-gray-600">Debug the complete purchase verification and bundle access flow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sessionId">Stripe Session ID</Label>
              <Input
                id="sessionId"
                placeholder="cs_live_... or cs_test_..."
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={isRunning}
              />
            </div>

            <Button onClick={debugPurchaseFlow} disabled={isRunning || !sessionId.trim()} className="w-full">
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Debug...
                </>
              ) : (
                "Start Debug Flow"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Steps Section */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.name} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">{getStepIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{step.name}</h4>
                      {getStepBadge(step.status)}
                    </div>
                    {step.timestamp && (
                      <p className="text-xs text-gray-500 mt-1">{new Date(step.timestamp).toLocaleTimeString()}</p>
                    )}
                    {step.error && <p className="text-sm text-red-600 mt-1">{step.error}</p>}
                    {step.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">View Data</summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Response Section */}
      {finalResponse && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Final API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(finalResponse, null, 2)}
              readOnly
              className="min-h-[400px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Test Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Test with Current URL</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              const urlParams = new URLSearchParams(window.location.search)
              const sessionIdFromUrl = urlParams.get("session_id")
              if (sessionIdFromUrl) {
                setSessionId(sessionIdFromUrl)
              } else {
                alert("No session_id found in current URL")
              }
            }}
            variant="outline"
            className="mr-2"
          >
            Extract from Current URL
          </Button>
          <Button
            onClick={() => {
              // Test with a sample session ID
              setSessionId("cs_live_b1QxinbfYwlE3HuoAgFpTSFsFgDrIvJVEJ1Y8sBxBee1HhosGoiXdMekIc")
            }}
            variant="outline"
          >
            Use Sample Session ID
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
