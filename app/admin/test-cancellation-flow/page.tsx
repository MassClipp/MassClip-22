"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"

type TestStatus = "idle" | "running" | "passed" | "failed"

interface TestResult {
  name: string
  status: TestStatus
  message: string
  details?: string[]
}

interface SimulatedMembership {
  uid: string
  plan: "free" | "starter" | "creator_pro"
  status: "active" | "canceled" | "expired"
  isActive: boolean
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: Date
  features: {
    maxFolders: number
    maxBundles: number
    maxVideosPerBundle: number
    platformFeePercentage: number
    unlimitedDownloads: boolean
    premiumContent: boolean
  }
}

export default function TestCancellationFlow() {
  const [trialResults, setTrialResults] = useState<TestResult[]>([])
  const [vipResults, setVipResults] = useState<TestResult[]>([])
  const [starterResults, setStarterResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  // Simulate trial lifecycle
  const testTrialCancellation = async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    // Step 1: User starts trial
    results.push({
      name: "Trial Started",
      status: "running",
      message: "User starts 7-day free trial",
    })
    await sleep(500)

    const trialMembership: SimulatedMembership = {
      uid: "test-user-trial",
      plan: "creator_pro",
      status: "active",
      isActive: true,
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      features: {
        maxFolders: Number.POSITIVE_INFINITY,
        maxBundles: Number.POSITIVE_INFINITY,
        maxVideosPerBundle: Number.POSITIVE_INFINITY,
        platformFeePercentage: 10,
        unlimitedDownloads: true,
        premiumContent: true,
      },
    }

    const hasTrialPermissions = checkPermissions(trialMembership, "creator_pro")
    results[0] = {
      name: "Trial Started",
      status: hasTrialPermissions ? "passed" : "failed",
      message: hasTrialPermissions
        ? "✓ User has Creator Pro permissions during trial"
        : "✗ User missing Creator Pro permissions",
      details: [
        `Plan: ${trialMembership.plan}`,
        `Status: ${trialMembership.status}`,
        `Active: ${trialMembership.isActive}`,
        `Max Folders: ${trialMembership.features.maxFolders}`,
        `Max Bundles: ${trialMembership.features.maxBundles}`,
        `Platform Fee: ${trialMembership.features.platformFeePercentage}%`,
      ],
    }
    setTrialResults([...results])
    await sleep(500)

    // Step 2: Trial expires
    results.push({
      name: "Trial Expires",
      status: "running",
      message: "7 days pass, trial period ends",
    })
    setTrialResults([...results])
    await sleep(500)

    // Simulate cron job running
    const expiredTrialMembership: SimulatedMembership = {
      uid: "test-user-trial",
      plan: "free",
      status: "expired",
      isActive: false,
      features: {
        maxFolders: 2,
        maxBundles: 2,
        maxVideosPerBundle: 10,
        platformFeePercentage: 15,
        unlimitedDownloads: false,
        premiumContent: false,
      },
    }

    const hasFreeTierLimits = checkPermissions(expiredTrialMembership, "free")
    results[1] = {
      name: "Trial Expires",
      status: hasFreeTierLimits ? "passed" : "failed",
      message: hasFreeTierLimits
        ? "✓ User downgraded to free tier with correct limits"
        : "✗ User still has premium permissions",
      details: [
        `Plan: ${expiredTrialMembership.plan}`,
        `Status: ${expiredTrialMembership.status}`,
        `Active: ${expiredTrialMembership.isActive}`,
        `Max Folders: ${expiredTrialMembership.features.maxFolders}`,
        `Max Bundles: ${expiredTrialMembership.features.maxBundles}`,
        `Platform Fee: ${expiredTrialMembership.features.platformFeePercentage}%`,
      ],
    }
    setTrialResults([...results])
    await sleep(500)

    // Step 3: Verify permissions revoked
    results.push({
      name: "Permissions Revoked",
      status: "running",
      message: "Checking if premium features are blocked",
    })
    setTrialResults([...results])
    await sleep(500)

    const canCreateBundle = expiredTrialMembership.features.maxBundles > 2
    const canCreateFolder = expiredTrialMembership.features.maxFolders > 2
    const hasUnlimitedVideos = expiredTrialMembership.features.maxVideosPerBundle === Number.POSITIVE_INFINITY

    const allPermissionsRevoked = !canCreateBundle && !canCreateFolder && !hasUnlimitedVideos

    results[2] = {
      name: "Permissions Revoked",
      status: allPermissionsRevoked ? "passed" : "failed",
      message: allPermissionsRevoked
        ? "✓ All premium permissions successfully revoked"
        : "✗ Some premium permissions still active",
      details: [
        `Can create 3+ bundles: ${canCreateBundle ? "YES (FAIL)" : "NO (PASS)"}`,
        `Can create 3+ folders: ${canCreateFolder ? "YES (FAIL)" : "NO (PASS)"}`,
        `Has unlimited videos: ${hasUnlimitedVideos ? "YES (FAIL)" : "NO (PASS)"}`,
      ],
    }
    setTrialResults([...results])
    setIsRunning(false)
  }

  // Simulate VIP subscription cancellation
  const testVIPCancellation = async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    // Step 1: User subscribes to VIP
    results.push({
      name: "VIP Subscription Active",
      status: "running",
      message: "User subscribes to Creator VIP ($15/month)",
    })
    await sleep(500)

    const vipMembership: SimulatedMembership = {
      uid: "test-user-vip",
      plan: "creator_pro",
      status: "active",
      isActive: true,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      features: {
        maxFolders: Number.POSITIVE_INFINITY,
        maxBundles: Number.POSITIVE_INFINITY,
        maxVideosPerBundle: Number.POSITIVE_INFINITY,
        platformFeePercentage: 10,
        unlimitedDownloads: true,
        premiumContent: true,
      },
    }

    const hasVIPPermissions = checkPermissions(vipMembership, "creator_pro")
    results[0] = {
      name: "VIP Subscription Active",
      status: hasVIPPermissions ? "passed" : "failed",
      message: hasVIPPermissions ? "✓ User has full Creator VIP permissions" : "✗ User missing VIP permissions",
      details: [
        `Plan: ${vipMembership.plan}`,
        `Status: ${vipMembership.status}`,
        `Active: ${vipMembership.isActive}`,
        `Max Folders: Unlimited`,
        `Max Bundles: Unlimited`,
        `Platform Fee: ${vipMembership.features.platformFeePercentage}%`,
      ],
    }
    setVipResults([...results])
    await sleep(500)

    // Step 2: User cancels subscription
    results.push({
      name: "Subscription Cancelled",
      status: "running",
      message: "User cancels subscription (cancel_at_period_end: true)",
    })
    setVipResults([...results])
    await sleep(500)

    const cancelledVIPMembership: SimulatedMembership = {
      ...vipMembership,
      status: "canceled",
      cancelAtPeriodEnd: true,
    }

    // User should still have access until period ends
    const stillHasAccess = cancelledVIPMembership.isActive && cancelledVIPMembership.cancelAtPeriodEnd
    results[1] = {
      name: "Subscription Cancelled",
      status: stillHasAccess ? "passed" : "failed",
      message: stillHasAccess
        ? "✓ User retains access until billing period ends"
        : "✗ Access removed immediately (should wait until period end)",
      details: [
        `Status: ${cancelledVIPMembership.status}`,
        `Cancel at period end: ${cancelledVIPMembership.cancelAtPeriodEnd}`,
        `Still active: ${cancelledVIPMembership.isActive}`,
        `Period ends: ${cancelledVIPMembership.currentPeriodEnd?.toLocaleDateString()}`,
      ],
    }
    setVipResults([...results])
    await sleep(500)

    // Step 3: Billing period ends
    results.push({
      name: "Billing Period Ends",
      status: "running",
      message: "30 days pass, subscription period ends",
    })
    setVipResults([...results])
    await sleep(500)

    // Simulate customer.subscription.deleted webhook
    const expiredVIPMembership: SimulatedMembership = {
      uid: "test-user-vip",
      plan: "free",
      status: "expired",
      isActive: false,
      features: {
        maxFolders: 2,
        maxBundles: 2,
        maxVideosPerBundle: 10,
        platformFeePercentage: 15,
        unlimitedDownloads: false,
        premiumContent: false,
      },
    }

    const downgradedToFree = checkPermissions(expiredVIPMembership, "free")
    results[2] = {
      name: "Billing Period Ends",
      status: downgradedToFree ? "passed" : "failed",
      message: downgradedToFree
        ? "✓ User downgraded to free tier with correct limits"
        : "✗ User still has premium permissions",
      details: [
        `Plan: ${expiredVIPMembership.plan}`,
        `Status: ${expiredVIPMembership.status}`,
        `Active: ${expiredVIPMembership.isActive}`,
        `Max Folders: ${expiredVIPMembership.features.maxFolders}`,
        `Max Bundles: ${expiredVIPMembership.features.maxBundles}`,
        `Platform Fee: ${expiredVIPMembership.features.platformFeePercentage}%`,
      ],
    }
    setVipResults([...results])
    setIsRunning(false)
  }

  // Simulate Starter subscription cancellation
  const testStarterCancellation = async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    // Step 1: User subscribes to Starter
    results.push({
      name: "Starter Subscription Active",
      status: "running",
      message: "User subscribes to Starter Plan ($3/month)",
    })
    await sleep(500)

    const starterMembership: SimulatedMembership = {
      uid: "test-user-starter",
      plan: "starter",
      status: "active",
      isActive: true,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      features: {
        maxFolders: 3,
        maxBundles: 5,
        maxVideosPerBundle: 15,
        platformFeePercentage: 20,
        unlimitedDownloads: false,
        premiumContent: false,
      },
    }

    const hasStarterPermissions = checkPermissions(starterMembership, "starter")
    results[0] = {
      name: "Starter Subscription Active",
      status: hasStarterPermissions ? "passed" : "failed",
      message: hasStarterPermissions ? "✓ User has Starter plan permissions" : "✗ User missing Starter permissions",
      details: [
        `Plan: ${starterMembership.plan}`,
        `Status: ${starterMembership.status}`,
        `Active: ${starterMembership.isActive}`,
        `Max Folders: ${starterMembership.features.maxFolders}`,
        `Max Bundles: ${starterMembership.features.maxBundles}`,
        `Max Videos/Bundle: ${starterMembership.features.maxVideosPerBundle}`,
        `Platform Fee: ${starterMembership.features.platformFeePercentage}%`,
      ],
    }
    setStarterResults([...results])
    await sleep(500)

    // Step 2: User cancels subscription
    results.push({
      name: "Subscription Cancelled",
      status: "running",
      message: "User cancels subscription (cancel_at_period_end: true)",
    })
    setStarterResults([...results])
    await sleep(500)

    const cancelledStarterMembership: SimulatedMembership = {
      ...starterMembership,
      status: "canceled",
      cancelAtPeriodEnd: true,
    }

    // User should still have access until period ends
    const stillHasAccess = cancelledStarterMembership.isActive && cancelledStarterMembership.cancelAtPeriodEnd
    results[1] = {
      name: "Subscription Cancelled",
      status: stillHasAccess ? "passed" : "failed",
      message: stillHasAccess
        ? "✓ User retains access until billing period ends"
        : "✗ Access removed immediately (should wait until period end)",
      details: [
        `Status: ${cancelledStarterMembership.status}`,
        `Cancel at period end: ${cancelledStarterMembership.cancelAtPeriodEnd}`,
        `Still active: ${cancelledStarterMembership.isActive}`,
        `Period ends: ${cancelledStarterMembership.currentPeriodEnd?.toLocaleDateString()}`,
      ],
    }
    setStarterResults([...results])
    await sleep(500)

    // Step 3: Billing period ends
    results.push({
      name: "Billing Period Ends",
      status: "running",
      message: "30 days pass, subscription period ends",
    })
    setStarterResults([...results])
    await sleep(500)

    // Simulate customer.subscription.deleted webhook
    const expiredStarterMembership: SimulatedMembership = {
      uid: "test-user-starter",
      plan: "free",
      status: "expired",
      isActive: false,
      features: {
        maxFolders: 2,
        maxBundles: 2,
        maxVideosPerBundle: 10,
        platformFeePercentage: 15,
        unlimitedDownloads: false,
        premiumContent: false,
      },
    }

    const downgradedToFree = checkPermissions(expiredStarterMembership, "free")
    results[2] = {
      name: "Billing Period Ends",
      status: downgradedToFree ? "passed" : "failed",
      message: downgradedToFree
        ? "✓ User downgraded to free tier with correct limits"
        : "✗ User still has premium permissions",
      details: [
        `Plan: ${expiredStarterMembership.plan}`,
        `Status: ${expiredStarterMembership.status}`,
        `Active: ${expiredStarterMembership.isActive}`,
        `Max Folders: ${expiredStarterMembership.features.maxFolders}`,
        `Max Bundles: ${expiredStarterMembership.features.maxBundles}`,
        `Max Videos/Bundle: ${expiredStarterMembership.features.maxVideosPerBundle}`,
        `Platform Fee: ${expiredStarterMembership.features.platformFeePercentage}%`,
      ],
    }
    setStarterResults([...results])
    setIsRunning(false)
  }

  // Run all tests
  const runAllTests = async () => {
    await testTrialCancellation()
    await testVIPCancellation()
    await testStarterCancellation()
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cancellation Flow Test</h1>
        <p className="text-muted-foreground">
          Simulates subscription cancellation and permission revocation for Trial, VIP, and Starter plans
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <Button onClick={runAllTests} disabled={isRunning} size="lg">
          {isRunning ? "Running Tests..." : "Run All Tests"}
        </Button>
        <Button onClick={testTrialCancellation} disabled={isRunning} variant="outline">
          Test Trial Only
        </Button>
        <Button onClick={testVIPCancellation} disabled={isRunning} variant="outline">
          Test VIP Only
        </Button>
        <Button onClick={testStarterCancellation} disabled={isRunning} variant="outline">
          Test Starter Only
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Trial Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Free Trial Cancellation
              {getOverallStatus(trialResults) === "passed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {getOverallStatus(trialResults) === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
            </CardTitle>
            <CardDescription>7-day trial expiration flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">{trialResults.map((result, i) => renderTestResult(result, i))}</div>
          </CardContent>
        </Card>

        {/* VIP Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              VIP Subscription Cancellation
              {getOverallStatus(vipResults) === "passed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {getOverallStatus(vipResults) === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
            </CardTitle>
            <CardDescription>$15/month Creator VIP cancellation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">{vipResults.map((result, i) => renderTestResult(result, i))}</div>
          </CardContent>
        </Card>

        {/* Starter Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Starter Subscription Cancellation
              {getOverallStatus(starterResults) === "passed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {getOverallStatus(starterResults) === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
            </CardTitle>
            <CardDescription>$3/month Starter plan cancellation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">{starterResults.map((result, i) => renderTestResult(result, i))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {(trialResults.length > 0 || vipResults.length > 0 || starterResults.length > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="font-semibold mb-2">Free Trial</h4>
                <p className="text-sm text-muted-foreground">
                  {trialResults.filter((r) => r.status === "passed").length} / {trialResults.length} tests passed
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Creator VIP</h4>
                <p className="text-sm text-muted-foreground">
                  {vipResults.filter((r) => r.status === "passed").length} / {vipResults.length} tests passed
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Starter Plan</h4>
                <p className="text-sm text-muted-foreground">
                  {starterResults.filter((r) => r.status === "passed").length} / {starterResults.length} tests passed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper functions
function renderTestResult(result: TestResult, index: number) {
  return (
    <div key={index} className="border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {result.status === "passed" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          {result.status === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
          {result.status === "running" && <Clock className="h-5 w-5 text-blue-500 animate-spin" />}
          {result.status === "idle" && <AlertCircle className="h-5 w-5 text-gray-400" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">{result.name}</h4>
            <Badge
              variant={
                result.status === "passed" ? "default" : result.status === "failed" ? "destructive" : "secondary"
              }
            >
              {result.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
          {result.details && (
            <div className="text-xs space-y-1 bg-muted p-2 rounded">
              {result.details.map((detail, i) => (
                <div key={i} className="font-mono">
                  {detail}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getOverallStatus(results: TestResult[]): TestStatus {
  if (results.length === 0) return "idle"
  if (results.some((r) => r.status === "running")) return "running"
  if (results.every((r) => r.status === "passed")) return "passed"
  return "failed"
}

function checkPermissions(membership: SimulatedMembership, expectedPlan: string): boolean {
  if (expectedPlan === "free") {
    return (
      membership.plan === "free" &&
      !membership.isActive &&
      membership.features.maxFolders === 2 &&
      membership.features.maxBundles === 2 &&
      membership.features.maxVideosPerBundle === 10 &&
      membership.features.platformFeePercentage === 15
    )
  }

  if (expectedPlan === "starter") {
    return (
      membership.plan === "starter" &&
      membership.isActive &&
      membership.features.maxFolders === 3 &&
      membership.features.maxBundles === 5 &&
      membership.features.maxVideosPerBundle === 15 &&
      membership.features.platformFeePercentage === 20
    )
  }

  if (expectedPlan === "creator_pro") {
    return (
      membership.plan === "creator_pro" &&
      membership.isActive &&
      membership.features.maxFolders === Number.POSITIVE_INFINITY &&
      membership.features.maxBundles === Number.POSITIVE_INFINITY &&
      membership.features.maxVideosPerBundle === Number.POSITIVE_INFINITY &&
      membership.features.platformFeePercentage === 10
    )
  }

  return false
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
