"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

type Plan = "free" | "faceless_pro" | "facelessprenuer"

export default function TestMembershipPermissionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [simulatingPurchase, setSimulatingPurchase] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<Plan>("free")
  const [permissions, setPermissions] = useState<any>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (user) {
      fetchCurrentPlan()
    }
  }, [user])

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch("/api/user/membership-status")
      const data = await response.json()
      setCurrentPlan(data.plan || "free")
      setPermissions(data.features)
    } catch (error) {
      console.error("Error fetching plan:", error)
    }
  }

  const setPlan = async (plan: Plan) => {
    if (!user) return

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/admin/set-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, plan }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Successfully set plan to ${plan}. Refreshing...`)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage(`❌ Error: ${data.error}`)
        setLoading(false)
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
      setLoading(false)
    }
  }

  const simulatePurchase = async (plan: "faceless_pro" | "facelessprenuer") => {
    if (!user) return

    setSimulatingPurchase(true)
    setMessage("")

    try {
      const response = await fetch("/api/debug/simulate-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, plan }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Successfully simulated ${plan} purchase! Refreshing...`)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage(`❌ Error: ${data.error}`)
        setSimulatingPurchase(false)
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
      setSimulatingPurchase(false)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to test membership permissions</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Membership Permissions</CardTitle>
          <CardDescription>Manually set your membership plan to test permissions without purchasing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-medium">Current Plan</h3>
            <Badge variant={currentPlan === "free" ? "secondary" : "default"} className="text-lg">
              {currentPlan === "faceless_pro"
                ? "Faceless Pro"
                : currentPlan === "facelessprenuer"
                  ? "Facelessprenuer"
                  : "Free"}
            </Badge>
          </div>

          {permissions && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-medium">Current Permissions</h3>
              <div className="grid gap-2 text-sm">
                <PermissionRow label="Unlimited Downloads" value={permissions.unlimitedDownloads} />
                <PermissionRow label="Premium Content" value={permissions.premiumContent} />
                <PermissionRow label="No Watermark" value={permissions.noWatermark} />
                <PermissionRow label="Priority Support" value={permissions.prioritySupport} />
                <PermissionRow label="Platform Fee" value={`${permissions.platformFeePercentage}%`} isText />
                <PermissionRow
                  label="Max Videos Per Bundle"
                  value={permissions.maxVideosPerBundle || "Unlimited"}
                  isText
                />
                <PermissionRow label="Max Bundles" value={permissions.maxBundles || "Unlimited"} isText />
                <PermissionRow label="Max Folders" value={permissions.maxFolders || "Unlimited"} isText />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Simulate Purchase (Webhook Flow)</h3>
            <p className="text-xs text-muted-foreground">
              Simulates a successful Stripe purchase and processes it through the same logic as the webhook handlers
            </p>
            <div className="grid gap-3">
              <Button
                onClick={() => simulatePurchase("faceless_pro")}
                disabled={simulatingPurchase || loading}
                variant="default"
                className="w-full justify-start"
              >
                {simulatingPurchase && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simulate Faceless Pro Purchase
              </Button>
              <Button
                onClick={() => simulatePurchase("facelessprenuer")}
                disabled={simulatingPurchase || loading}
                variant="default"
                className="w-full justify-start"
              >
                {simulatingPurchase && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simulate Facelessprenuer Purchase
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Manual Plan Setting (Direct Database Update)</h3>
            <p className="text-xs text-muted-foreground">
              Directly updates your membership in the database without going through Stripe
            </p>
            <div className="grid gap-3">
              <Button
                onClick={() => setPlan("free")}
                disabled={loading || currentPlan === "free" || simulatingPurchase}
                variant={currentPlan === "free" ? "secondary" : "outline"}
                className="w-full justify-start"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Free Plan
              </Button>
              <Button
                onClick={() => setPlan("faceless_pro")}
                disabled={loading || currentPlan === "faceless_pro" || simulatingPurchase}
                variant={currentPlan === "faceless_pro" ? "secondary" : "outline"}
                className="w-full justify-start"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Faceless Pro ($29/month)
              </Button>
              <Button
                onClick={() => setPlan("facelessprenuer")}
                disabled={loading || currentPlan === "facelessprenuer" || simulatingPurchase}
                variant={currentPlan === "facelessprenuer" ? "secondary" : "outline"}
                className="w-full justify-start"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Facelessprenuer ($39/month)
              </Button>
            </div>
          </div>

          {message && (
            <div className="rounded-lg border bg-muted p-3 text-sm">
              <p>{message}</p>
            </div>
          )}

          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
            <p className="font-medium">⚠️ Debug Tool</p>
            <p className="mt-1 text-xs">
              This page is for testing only. It directly modifies your membership in the database without going through
              Stripe.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PermissionRow({
  label,
  value,
  isText = false,
}: {
  label: string
  value: boolean | string | number
  isText?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {isText ? (
        <span className="font-medium">{value}</span>
      ) : value ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
    </div>
  )
}
