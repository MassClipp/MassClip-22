"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Expected permissions for each plan
const EXPECTED_PERMISSIONS = {
  free: {
    plan: "free",
    unlimitedDownloads: false,
    premiumContent: false,
    noWatermark: false,
    prioritySupport: false,
    platformFee: 20,
    maxVideosPerBundle: 10,
    maxBundles: 2,
    maxFolders: 1,
  },
  faceless_pro: {
    plan: "faceless_pro",
    unlimitedDownloads: false,
    premiumContent: true,
    noWatermark: true,
    prioritySupport: false,
    platformFee: 15,
    maxVideosPerBundle: 25,
    maxBundles: 10,
    maxFolders: 5,
  },
  facelessprenuer: {
    plan: "facelessprenuer",
    unlimitedDownloads: true,
    premiumContent: true,
    noWatermark: true,
    prioritySupport: true,
    platformFee: 10,
    maxVideosPerBundle: null, // unlimited
    maxBundles: null, // unlimited
    maxFolders: null, // unlimited
  },
}

interface ActualPermissions {
  plan: string
  unlimitedDownloads: boolean
  premiumContent: boolean
  noWatermark: boolean
  prioritySupport: boolean
  platformFee: number
  maxVideosPerBundle: number | null
  maxBundles: number | null
  maxFolders: number | null
}

interface TrialEligibility {
  isEligible: boolean
  hasUsedFreeTrial: boolean
  hasActiveSubscription: boolean
  currentPlan: string
  reason: string
}

export default function VerifyPlanPermissionsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [actualPermissions, setActualPermissions] = useState<ActualPermissions | null>(null)
  const [trialEligibility, setTrialEligibility] = useState<TrialEligibility | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchActualPermissions = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Fetch membership status
      const membershipRes = await fetch("/api/membership-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (!membershipRes.ok) {
        throw new Error("Failed to fetch membership status")
      }

      const membershipData = await membershipRes.json()

      // Fetch trial eligibility
      const trialRes = await fetch("/api/user/trial-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      let trialData = null
      if (trialRes.ok) {
        trialData = await trialRes.json()
      }

      // Map membership data to actual permissions
      const actual: ActualPermissions = {
        plan: membershipData.plan || "free",
        unlimitedDownloads: membershipData.features?.unlimitedDownloads || false,
        premiumContent: membershipData.features?.premiumContent || false,
        noWatermark: membershipData.features?.noWatermark || false,
        prioritySupport: membershipData.features?.prioritySupport || false,
        platformFee: membershipData.features?.platformFeePercentage || 20,
        maxVideosPerBundle: membershipData.features?.maxVideosPerBundle ?? 10,
        maxBundles: membershipData.features?.maxBundles ?? 2,
        maxFolders: membershipData.features?.maxFolders ?? 1,
      }

      setActualPermissions(actual)

      // Set trial eligibility
      if (trialData) {
        const isEligible = !trialData.hasUsedFreeTrial && !trialData.hasActiveCreatorVIP
        setTrialEligibility({
          isEligible,
          hasUsedFreeTrial: trialData.hasUsedFreeTrial,
          hasActiveSubscription: trialData.hasActiveCreatorVIP,
          currentPlan: actual.plan,
          reason: isEligible
            ? "User is eligible for free trial"
            : trialData.hasUsedFreeTrial
              ? "User has already used their free trial"
              : "User has an active subscription",
        })
      }
    } catch (err) {
      console.error("Error fetching permissions:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch permissions")
    } finally {
      setLoading(false)
    }
  }

  const renderPermissionComparison = (planKey: keyof typeof EXPECTED_PERMISSIONS) => {
    const expected = EXPECTED_PERMISSIONS[planKey]
    const actual = actualPermissions

    if (!actual || actual.plan !== planKey) {
      return (
        <div className="text-sm text-zinc-500">User is not on this plan. Current plan: {actual?.plan || "unknown"}</div>
      )
    }

    const comparisons = [
      { label: "Unlimited Downloads", expected: expected.unlimitedDownloads, actual: actual.unlimitedDownloads },
      { label: "Premium Content", expected: expected.premiumContent, actual: actual.premiumContent },
      { label: "No Watermark", expected: expected.noWatermark, actual: actual.noWatermark },
      { label: "Priority Support", expected: expected.prioritySupport, actual: actual.prioritySupport },
      { label: "Platform Fee", expected: expected.platformFee, actual: actual.platformFee },
      { label: "Max Videos Per Bundle", expected: expected.maxVideosPerBundle, actual: actual.maxVideosPerBundle },
      { label: "Max Bundles", expected: expected.maxBundles, actual: actual.maxBundles },
      { label: "Max Folders", expected: expected.maxFolders, actual: actual.maxFolders },
    ]

    const hasIssues = comparisons.some((c) => c.expected !== c.actual)

    return (
      <div className="space-y-3">
        {hasIssues && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-500 font-semibold text-sm">❌ Permissions Mismatch Detected</p>
          </div>
        )}
        {!hasIssues && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
            <p className="text-green-500 font-semibold text-sm">✅ All Permissions Match Expected Values</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-zinc-400 pb-2 border-b border-zinc-800">
          <div>Permission</div>
          <div>Expected</div>
          <div>Actual</div>
        </div>

        {comparisons.map((comparison, idx) => {
          const matches = comparison.expected === comparison.actual
          const expectedDisplay =
            comparison.expected === null
              ? "Unlimited"
              : comparison.expected === true
                ? "✓"
                : comparison.expected === false
                  ? "✗"
                  : comparison.expected
          const actualDisplay =
            comparison.actual === null
              ? "Unlimited"
              : comparison.actual === true
                ? "✓"
                : comparison.actual === false
                  ? "✗"
                  : comparison.actual

          return (
            <div
              key={idx}
              className={`grid grid-cols-3 gap-2 text-sm py-2 border-b border-zinc-800/50 ${!matches ? "bg-red-500/5" : ""}`}
            >
              <div className="text-zinc-300">{comparison.label}</div>
              <div className="text-zinc-400">{expectedDisplay}</div>
              <div className={matches ? "text-green-500" : "text-red-500 font-semibold"}>{actualDisplay}</div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Plan Permissions Verification</h1>
          <p className="text-zinc-400">
            Compare expected vs actual permissions for each plan and verify free trial eligibility
          </p>
        </div>

        {!user && (
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <p className="text-zinc-400">Please sign in to verify plan permissions</p>
          </Card>
        )}

        {user && (
          <>
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Current User</h2>
                  <p className="text-sm text-zinc-400">{user.email}</p>
                </div>
                <Button onClick={fetchActualPermissions} disabled={loading}>
                  {loading ? "Loading..." : "Fetch Current Permissions"}
                </Button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}
            </Card>

            {actualPermissions && (
              <>
                {/* Free Trial Eligibility */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h2 className="text-xl font-semibold mb-4">Free Trial Eligibility</h2>
                  {trialEligibility ? (
                    <div className="space-y-3">
                      <div
                        className={`rounded-lg p-4 ${trialEligibility.isEligible ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}
                      >
                        <p
                          className={`font-semibold ${trialEligibility.isEligible ? "text-green-500" : "text-red-500"}`}
                        >
                          {trialEligibility.isEligible
                            ? "✅ Eligible for Free Trial"
                            : "❌ Not Eligible for Free Trial"}
                        </p>
                        <p className="text-sm text-zinc-400 mt-1">{trialEligibility.reason}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-zinc-400">Has Used Free Trial:</span>
                          <span
                            className={`ml-2 font-semibold ${trialEligibility.hasUsedFreeTrial ? "text-red-500" : "text-green-500"}`}
                          >
                            {trialEligibility.hasUsedFreeTrial ? "Yes" : "No"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Has Active Subscription:</span>
                          <span
                            className={`ml-2 font-semibold ${trialEligibility.hasActiveSubscription ? "text-red-500" : "text-green-500"}`}
                          >
                            {trialEligibility.hasActiveSubscription ? "Yes" : "No"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Current Plan:</span>
                          <span className="ml-2 font-semibold text-white">{trialEligibility.currentPlan}</span>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                        <p className="text-xs text-zinc-400 mb-2">Expected Behavior:</p>
                        <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                          <li>Free users who have never subscribed: Eligible ✓</li>
                          <li>Users who purchased Facelessprenuer: Not eligible ✗</li>
                          <li>Users who purchased Faceless Pro: Not eligible ✗</li>
                          <li>Users who already used free trial: Not eligible ✗</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-400 text-sm">Click "Fetch Current Permissions" to check eligibility</p>
                  )}
                </Card>

                {/* Free Plan */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h2 className="text-xl font-semibold mb-4">Free Plan (Non-Paying Users)</h2>
                  {renderPermissionComparison("free")}
                </Card>

                {/* Faceless Pro Plan */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h2 className="text-xl font-semibold mb-4">Faceless Pro Plan ($29/month)</h2>
                  {renderPermissionComparison("faceless_pro")}
                </Card>

                {/* Facelessprenuer Plan */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h2 className="text-xl font-semibold mb-4">Facelessprenuer Plan ($39/month)</h2>
                  {renderPermissionComparison("facelessprenuer")}
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
