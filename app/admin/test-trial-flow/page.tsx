"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface TestStep {
  name: string
  status: "pending" | "running" | "success" | "error"
  message?: string
  data?: any
}

export default function TestTrialFlowPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<TestStep[]>([
    { name: "Check User Authentication", status: "pending" },
    { name: "Start 3-Day Free Trial", status: "pending" },
    { name: "Verify Trial Permissions", status: "pending" },
    { name: "Check Database Records", status: "pending" },
  ])

  const updateStep = (index: number, updates: Partial<TestStep>) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...updates } : step)))
  }

  const runTrialFlow = async () => {
    if (!user) {
      alert("Please log in first")
      return
    }

    setLoading(true)

    try {
      // Step 1: Check authentication
      updateStep(0, { status: "running" })
      await new Promise((resolve) => setTimeout(resolve, 500))
      updateStep(0, {
        status: "success",
        message: `Authenticated as ${user.email}`,
        data: { uid: user.uid, email: user.email },
      })

      // Step 2: Start trial
      updateStep(1, { status: "running", message: "Calling /api/trial/start..." })
      const token = await user.getIdToken()
      const trialResponse = await fetch("/api/trial/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const trialData = await trialResponse.json()
      console.log("[v0] Trial start response:", trialData)

      if (!trialResponse.ok) {
        throw new Error(trialData.error || "Failed to start trial")
      }

      updateStep(1, {
        status: "success",
        message: "Trial started successfully",
        data: trialData,
      })

      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Step 3: Verify permissions
      updateStep(2, { status: "running", message: "Checking trial permissions..." })

      const permissionsResponse = await fetch(`/api/user/trial-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const permissionsData = await permissionsResponse.json()
      console.log("[v0] Permissions check:", permissionsData)

      updateStep(2, {
        status: permissionsData.isOnTrial ? "success" : "error",
        message: permissionsData.isOnTrial
          ? `Trial active! ${permissionsData.daysRemaining} days remaining`
          : "Trial not active",
        data: permissionsData,
      })

      // Step 4: Check database records directly
      updateStep(3, { status: "running", message: "Verifying database records..." })

      const membershipResponse = await fetch(`/api/debug/check-membership?userId=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const membershipData = await membershipResponse.json()
      console.log("[v0] Membership check:", membershipData)

      // Check if user document was updated
      const userCheckResponse = await fetch(`/api/debug/user-bundle-data?userId=${user.uid}`)
      const userCheckData = await userCheckResponse.json()
      console.log("[v0] User data check:", userCheckData)

      const hasTrialPermissions =
        userCheckData.processedData?.freeUser?.canCreateBundles &&
        userCheckData.processedData?.freeUser?.canAnalyzeTranscripts

      updateStep(3, {
        status: hasTrialPermissions ? "success" : "error",
        message: hasTrialPermissions
          ? "Database records updated correctly"
          : "Database records missing trial permissions",
        data: {
          membership: membershipData,
          freeUser: userCheckData.processedData?.freeUser,
          user: userCheckData.processedData?.user,
        },
      })
    } catch (error: any) {
      console.error("[v0] Trial flow error:", error)
      const currentStep = steps.findIndex((s) => s.status === "running")
      if (currentStep !== -1) {
        updateStep(currentStep, {
          status: "error",
          message: error.message,
          data: { error: error.toString(), stack: error.stack },
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const resetTest = () => {
    setSteps([
      { name: "Check User Authentication", status: "pending" },
      { name: "Start 3-Day Free Trial", status: "pending" },
      { name: "Verify Trial Permissions", status: "pending" },
      { name: "Check Database Records", status: "pending" },
    ])
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Test Free Trial Flow</h1>
          <p className="text-white/60">Test the complete flow: User signup → 3-day trial → Permission access</p>
        </div>

        {user && (
          <Card className="bg-cyan-500/10 border-cyan-500/20">
            <CardContent className="pt-6">
              <p className="text-cyan-400">
                <strong>Logged in as:</strong> {user.email}
              </p>
              <p className="text-xs text-cyan-400/60 mt-1">UID: {user.uid}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Trial Flow Test</CardTitle>
            <CardDescription className="text-white/60">
              This will test the entire free trial activation and permission granting process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    step.status === "success"
                      ? "bg-green-500/10 border-green-500/20"
                      : step.status === "error"
                        ? "bg-red-500/10 border-red-500/20"
                        : step.status === "running"
                          ? "bg-cyan-500/10 border-cyan-500/20"
                          : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {step.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                      {step.status === "error" && <XCircle className="w-5 h-5 text-red-400" />}
                      {step.status === "running" && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
                      {step.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-white/20" />}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          step.status === "success"
                            ? "text-green-400"
                            : step.status === "error"
                              ? "text-red-400"
                              : step.status === "running"
                                ? "text-cyan-400"
                                : "text-white/60"
                        }`}
                      >
                        {step.name}
                      </p>
                      {step.message && (
                        <p
                          className={`text-sm mt-1 ${
                            step.status === "success"
                              ? "text-green-400/80"
                              : step.status === "error"
                                ? "text-red-400/80"
                                : "text-cyan-400/80"
                          }`}
                        >
                          {step.message}
                        </p>
                      )}
                      {step.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                            View data
                          </summary>
                          <pre className="mt-2 bg-black/50 p-2 rounded text-xs text-white/80 overflow-auto max-h-40">
                            {JSON.stringify(step.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={runTrialFlow} disabled={loading || !user} className="flex-1" size="lg">
                {loading ? "Running Test..." : "Run Trial Flow Test"}
              </Button>
              <Button onClick={resetTest} disabled={loading} variant="outline" size="lg">
                Reset
              </Button>
            </div>

            {!user && <p className="text-sm text-red-400">You must be logged in to run this test</p>}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">What This Tests</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 space-y-2 text-sm">
            <p>
              <strong>Step 1:</strong> Verifies you're authenticated with Firebase
            </p>
            <p>
              <strong>Step 2:</strong> Calls /api/trial/start to activate 3-day trial
            </p>
            <p>
              <strong>Step 3:</strong> Checks /api/user/trial-status to verify trial is active
            </p>
            <p>
              <strong>Step 4:</strong> Verifies database records (users, freeUsers) have correct permissions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
