"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"

export default function MembershipDebugPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [membershipData, setMembershipData] = useState<any>(null)
  const [trialData, setTrialData] = useState<any>(null)
  const [customDomainAccess, setCustomDomainAccess] = useState<any>(null)
  const [tabsAccess, setTabsAccess] = useState<any>(null)
  const [checkoutTrialData, setCheckoutTrialData] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchAllData()
    }
  }, [user])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const token = await user?.getIdToken()

      // Fetch membership status
      const membershipRes = await fetch("/api/membership-status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const membership = await membershipRes.json()
      setMembershipData(membership)

      // Fetch trial status
      const trialRes = await fetch("/api/user/trial-status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const trial = await trialRes.json()
      setTrialData(trial)

      // Test custom domain access
      const domainRes = await fetch("/api/custom-domain/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCustomDomainAccess({
        status: domainRes.status,
        hasAccess: domainRes.ok,
        data: domainRes.ok ? await domainRes.json() : await domainRes.text(),
      })

      // Test tabs access
      const tabsRes = await fetch("/api/storefront-tabs", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTabsAccess({
        status: tabsRes.status,
        hasAccess: tabsRes.ok,
        data: tabsRes.ok ? await tabsRes.json() : await tabsRes.text(),
      })

      // Simulate checkout trial check
      const checkoutSimulation = {
        hasUsedTrial: trial.hasUsedFreeTrial,
        expectedPrice: trial.hasUsedFreeTrial ? "$39/month (no trial)" : "3-day trial then $39/month",
        shouldShowTrial: !trial.hasUsedFreeTrial,
      }
      setCheckoutTrialData(checkoutSimulation)
    } catch (error) {
      console.error("Error fetching debug data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAllData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  const isFacelessprenuer =
    membershipData?.plan === "facelessprenuer" || membershipData?.membershipTier === "facelessprenuer"
  const isActive = membershipData?.isActive || membershipData?.membershipStatus === "active"

  return (
    <div className="min-h-screen p-6 bg-black text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Membership Debug Dashboard</h1>
            <p className="text-zinc-400 mt-2">Diagnose membership detection issues</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-zinc-700 bg-transparent"
          >
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh All Data
          </Button>
        </div>

        {/* Overall Status */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Overall Status</CardTitle>
            <CardDescription>Current membership detection results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <span>Is Facelessprenuer:</span>
                {isFacelessprenuer ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Yes
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    No
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <span>Is Active:</span>
                {isActive ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Yes
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    No
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Status API */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Membership Status API Response</CardTitle>
            <CardDescription>/api/membership-status</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-black p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(membershipData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Trial Status API */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Trial Status API Response</CardTitle>
            <CardDescription>/api/user/trial-status</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-black p-4 rounded-lg overflow-auto text-xs">{JSON.stringify(trialData, null, 2)}</pre>
          </CardContent>
        </Card>

        {/* Custom Domain Access */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Custom Domain Access Test</CardTitle>
            <CardDescription>Should be accessible for Facelessprenuer members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <span>Access Granted:</span>
              {isFacelessprenuer && isActive ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Should Have Access
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Should Be Locked
                </Badge>
              )}
            </div>
            <pre className="bg-black p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(customDomainAccess, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Tabs Access */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Custom Tabs Access Test</CardTitle>
            <CardDescription>Add Custom Tab button should be enabled for Facelessprenuer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <span>Can Add Custom Tabs:</span>
              {isFacelessprenuer && isActive ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Should Be Enabled
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Should Be Locked
                </Badge>
              )}
            </div>
            <pre className="bg-black p-4 rounded-lg overflow-auto text-xs">{JSON.stringify(tabsAccess, null, 2)}</pre>
          </CardContent>
        </Card>

        {/* Checkout Trial Detection */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Checkout Trial Detection</CardTitle>
            <CardDescription>Facelessprenuer checkout should respect trial usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <span>Has Used Free Trial:</span>
                {checkoutTrialData?.hasUsedTrial ? (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Yes - No Trial
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    No - Eligible for Trial
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <span>Expected Checkout Price:</span>
                <span className="font-mono text-sm">{checkoutTrialData?.expectedPrice}</span>
              </div>
            </div>
            <pre className="bg-black p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(checkoutTrialData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Expected vs Actual */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Issues Detected</CardTitle>
            <CardDescription>Comparing expected vs actual behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isFacelessprenuer && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">Not Detected as Facelessprenuer</p>
                    <p className="text-sm text-red-300/80 mt-1">
                      Plan: {membershipData?.plan || membershipData?.membershipTier || "unknown"}
                    </p>
                    <p className="text-sm text-red-300/80">
                      Status: {membershipData?.status || membershipData?.membershipStatus || "unknown"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!isActive && isFacelessprenuer && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-400">Membership Not Active</p>
                    <p className="text-sm text-amber-300/80 mt-1">
                      You have Facelessprenuer plan but status is:{" "}
                      {membershipData?.status || membershipData?.membershipStatus}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {isFacelessprenuer && isActive && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-400">All Good!</p>
                    <p className="text-sm text-green-300/80 mt-1">Facelessprenuer membership detected correctly</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
