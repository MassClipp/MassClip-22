"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface DebugStep {
  name: string
  status: "pending" | "success" | "error" | "running"
  timestamp?: string
  data?: any
  error?: string
  details?: string
}

export default function DebugPurchaseComprehensive() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [sessionId, setSessionId] = useState("cs_live_bfQXinbfYWlE3HuoAgFpTSFsFgDrivJvEJiY8sBxBeeHhosGoiX")
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<DebugStep[]>([])
  const [finalResponse, setFinalResponse] = useState<any>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const updateStep = (stepName: string, updates: Partial<DebugStep>) => {
    setSteps((prev) => {
      const existingIndex = prev.findIndex((s) => s.name === stepName)
      const timestamp = new Date().toLocaleTimeString()

      if (existingIndex >= 0) {
        const newSteps = [...prev]
        newSteps[existingIndex] = { ...newSteps[existingIndex], ...updates, timestamp }
        return newSteps
      } else {
        return [...prev, { name: stepName, status: "pending", ...updates, timestamp }]
      }
    })
  }

  const toggleStepExpansion = (stepName: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stepName)) {
        newSet.delete(stepName)
      } else {
        newSet.add(stepName)
      }
      return newSet
    })
  }

  const startDebugFlow = async () => {
    if (!sessionId.trim()) {
      alert("Please enter a session ID")
      return
    }

    setIsRunning(true)
    setSteps([])
    setFinalResponse(null)
    setExpandedSteps(new Set())

    try {
      // Step 1: Extract Session ID
      updateStep("Extract Session ID", { status: "running" })
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (!sessionId.startsWith("cs_")) {
        updateStep("Extract Session ID", {
          status: "error",
          error: "Invalid session ID format",
          data: { sessionId, expected: "cs_*" },
        })
        return
      }

      updateStep("Extract Session ID", {
        status: "success",
        data: { sessionId, isLive: sessionId.includes("live"), isTest: sessionId.includes("test") },
      })

      // Step 2: Get Auth Token
      updateStep("Get Auth Token", { status: "running" })
      await new Promise((resolve) => setTimeout(resolve, 300))

      if (authLoading) {
        updateStep("Get Auth Token", {
          status: "error",
          error: "Auth still loading",
          data: { authLoading, user: null },
        })
        return
      }

      let idToken = null
      if (user) {
        try {
          idToken = await user.getIdToken()
          updateStep("Get Auth Token", {
            status: "success",
            data: {
              hasUser: !!user,
              userId: user.uid,
              email: user.email,
              tokenLength: idToken?.length || 0,
            },
          })
        } catch (error: any) {
          updateStep("Get Auth Token", {
            status: "error",
            error: error.message,
            data: { hasUser: !!user, userId: user?.uid },
          })
          return
        }
      } else {
        updateStep("Get Auth Token", {
          status: "success",
          data: { hasUser: false, message: "Proceeding without authentication" },
        })
      }

      // Step 3: Call Verification API
      updateStep("Call Verification API", { status: "running" })

      const verificationResponse = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          idToken,
        }),
      })

      const responseText = await verificationResponse.text()
      let verificationData

      try {
        verificationData = JSON.parse(responseText)
      } catch (parseError) {
        updateStep("Call Verification API", {
          status: "error",
          error: "Failed to parse response as JSON",
          data: {
            status: verificationResponse.status,
            statusText: verificationResponse.statusText,
            responseText: responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""),
          },
        })
        return
      }

      if (!verificationResponse.ok) {
        updateStep("Call Verification API", {
          status: "error",
          error: `HTTP ${verificationResponse.status}: ${verificationResponse.statusText}`,
          data: verificationData,
        })
        return
      }

      updateStep("Call Verification API", {
        status: "success",
        data: {
          status: verificationResponse.status,
          success: verificationData.success,
          hasItem: !!verificationData.item,
          hasPurchase: !!verificationData.purchase,
          hasSession: !!verificationData.session,
        },
      })

      // Step 4: Parse Response
      updateStep("Parse Response", { status: "running" })
      await new Promise((resolve) => setTimeout(resolve, 200))

      const requiredFields = ["success", "item", "purchase", "session"]
      const missingFields = requiredFields.filter((field) => !verificationData[field])

      if (missingFields.length > 0) {
        updateStep("Parse Response", {
          status: "error",
          error: `Missing required fields: ${missingFields.join(", ")}`,
          data: {
            present: requiredFields.filter((field) => verificationData[field]),
            missing: missingFields,
            responseKeys: Object.keys(verificationData),
          },
        })
        return
      }

      updateStep("Parse Response", {
        status: "success",
        data: {
          allFieldsPresent: true,
          itemType: verificationData.item?.type,
          purchaseStatus: verificationData.purchase?.status,
          sessionPaymentStatus: verificationData.session?.payment_status,
        },
      })

      // Step 5: Validate Session Data
      updateStep("Validate Session Data", { status: "running" })
      await new Promise((resolve) => setTimeout(resolve, 200))

      const session = verificationData.session
      const sessionErrors = []

      if (session.payment_status !== "paid") {
        sessionErrors.push(`Payment status is ${session.payment_status}, expected 'paid'`)
      }
      if (!session.amount || session.amount <= 0) {
        sessionErrors.push(`Invalid amount: ${session.amount}`)
      }
      if (!session.currency) {
        sessionErrors.push("Missing currency")
      }

      if (sessionErrors.length > 0) {
        updateStep("Validate Session Data", {
          status: "error",
          error: sessionErrors.join("; "),
          data: session,
        })
        return
      }

      updateStep("Validate Session Data", {
        status: "success",
        data: {
          paymentStatus: session.payment_status,
          amount: session.amount,
          currency: session.currency,
          customerEmail: session.customerEmail,
          retrievalMethod: session.retrievalMethod,
        },
      })

      // Step 6: Validate Bundle Data
      updateStep("Validate Bundle Data", { status: "running" })
      await new Promise((resolve) => setTimeout(resolve, 200))

      const item = verificationData.item
      const bundleErrors = []

      // Check for required bundle fields
      if (!item.title) bundleErrors.push("title")
      if (!item.downloadUrl && !item.fileUrl) bundleErrors.push("downloadUrl/fileUrl")
      if (!item.creator?.name) bundleErrors.push("creator.name")
      if (!item.id) bundleErrors.push("id")

      if (bundleErrors.length > 0) {
        updateStep("Validate Bundle Data", {
          status: "error",
          error: `Missing fields: ${bundleErrors.join(", ")}`,
          data: {
            item,
            missingFields: bundleErrors,
            hasDownloadUrl: !!(item.downloadUrl || item.fileUrl),
            hasCreator: !!item.creator,
            creatorFields: item.creator ? Object.keys(item.creator) : [],
          },
        })
        return
      }

      updateStep("Validate Bundle Data", {
        status: "success",
        data: {
          title: item.title,
          hasDownloadUrl: !!(item.downloadUrl || item.fileUrl),
          downloadUrl: item.downloadUrl || item.fileUrl,
          creatorName: item.creator.name,
          fileSize: item.fileSize,
          duration: item.duration,
          type: item.type,
        },
      })

      // Step 7: Test Bundle Access
      updateStep("Test Bundle Access", { status: "running" })
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Test if the download URL is accessible
      const downloadUrl = item.downloadUrl || item.fileUrl
      if (downloadUrl) {
        try {
          const headResponse = await fetch(downloadUrl, { method: "HEAD" })

          if (headResponse.ok) {
            updateStep("Test Bundle Access", {
              status: "success",
              data: {
                downloadUrl,
                accessible: true,
                contentType: headResponse.headers.get("content-type"),
                contentLength: headResponse.headers.get("content-length"),
                status: headResponse.status,
              },
            })
          } else {
            updateStep("Test Bundle Access", {
              status: "error",
              error: `Access denied: HTTP ${headResponse.status}`,
              data: {
                downloadUrl,
                accessible: false,
                status: headResponse.status,
                statusText: headResponse.statusText,
              },
            })
          }
        } catch (accessError: any) {
          updateStep("Test Bundle Access", {
            status: "error",
            error: `Network error: ${accessError.message}`,
            data: {
              downloadUrl,
              accessible: false,
              error: accessError.message,
            },
          })
        }
      } else {
        updateStep("Test Bundle Access", {
          status: "error",
          error: "No download URL to test",
          data: { downloadUrl: null },
        })
      }

      setFinalResponse(verificationData)
    } catch (error: any) {
      console.error("Debug flow error:", error)
      updateStep("Debug Flow", {
        status: "error",
        error: error.message,
        data: { stack: error.stack },
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: DebugStep["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "running":
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: DebugStep["status"]) => {
    const variants = {
      success: "default",
      error: "destructive",
      running: "secondary",
      pending: "outline",
    } as const

    const labels = {
      success: "Success",
      error: "Error",
      running: "Running",
      pending: "Pending",
    }

    return (
      <Badge variant={variants[status]} className="ml-auto">
        {labels[status]}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Stripe Session ID</label>
              <Input
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="cs_live_..."
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={startDebugFlow} disabled={isRunning || !sessionId.trim()} className="w-full">
              {isRunning ? "Running Debug Flow..." : "Start Debug Flow"}
            </Button>
          </CardContent>
        </Card>

        {/* Debug Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.name} className="border rounded-lg p-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleStepExpansion(step.name)}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(step.status)}
                      <div>
                        <div className="font-medium">{step.name}</div>
                        {step.timestamp && <div className="text-xs text-gray-500">{step.timestamp}</div>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(step.status)}
                      {(step.data || step.error) &&
                        (expandedSteps.has(step.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        ))}
                    </div>
                  </div>

                  {step.error && <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{step.error}</div>}

                  {step.details && (
                    <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">{step.details}</div>
                  )}

                  {expandedSteps.has(step.name) && (step.data || step.error) && (
                    <div className="mt-3 border-t pt-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            View Data
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>{step.name} - Data</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh]">
                            <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                              {JSON.stringify(step.data || step.error, null, 2)}
                            </pre>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Response */}
      {finalResponse && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Final API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">View Full Response</Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Complete API Response</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[70vh]">
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify(finalResponse, null, 2)}
                  </pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium">Item Type</div>
                <div className="text-lg">{finalResponse.item?.type || "Unknown"}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium">Purchase Status</div>
                <div className="text-lg">{finalResponse.purchase?.status || "Unknown"}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium">Payment Status</div>
                <div className="text-lg">{finalResponse.session?.payment_status || "Unknown"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
