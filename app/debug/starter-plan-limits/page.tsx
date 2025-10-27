"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

interface DebugData {
  // User info
  userUid: string | null
  userEmail: string | null

  // freeUsers document
  freeUsersDoc: any

  // Membership status
  membershipStatus: any

  // Tier limits from hook
  freeTierLimits: any

  // API responses
  bundleLimitsAPI: any
  tierInfoAPI: any

  // Calculated values
  expectedBundleLimit: number
  actualBundleLimit: number
  expectedVideoLimit: number
  actualVideoLimit: number
}

export default function StarterPlanLimitsDebug() {
  const { user } = useAuth()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    async function fetchDebugData() {
      try {
        setLoading(true)
        setError(null)

        const token = await user.getIdToken()

        // Fetch freeUsers document
        const freeUsersRes = await fetch("/api/debug/get-free-users-doc", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const freeUsersDoc = await freeUsersRes.json()

        // Fetch membership status
        const membershipRes = await fetch("/api/membership-status", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const membershipStatus = await membershipRes.json()

        // Fetch tier limits from API
        const tierLimitsRes = await fetch("/api/user/get-tier-limits", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const freeTierLimits = await tierLimitsRes.json()

        // Fetch bundle limits API
        const bundleLimitsRes = await fetch("/api/user/check-bundle-limits", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const bundleLimitsAPI = await bundleLimitsRes.json()

        // Fetch tier info API (used by add-content)
        const tierInfoRes = await fetch("/api/debug/get-tier-info", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const tierInfoAPI = await tierInfoRes.json()

        const expectedBundleLimit = 5 // Starter plan limit
        const expectedVideoLimit = 15 // Starter plan limit
        const actualBundleLimit = membershipStatus?.features?.maxBundles || freeUsersDoc?.data?.bundlesLimit || 0
        const actualVideoLimit =
          membershipStatus?.features?.maxVideosPerBundle || freeUsersDoc?.data?.maxVideosPerBundle || 0

        setDebugData({
          userUid: user.uid,
          userEmail: user.email,
          freeUsersDoc,
          membershipStatus,
          freeTierLimits,
          bundleLimitsAPI,
          tierInfoAPI,
          expectedBundleLimit,
          actualBundleLimit,
          expectedVideoLimit,
          actualVideoLimit,
        })
      } catch (err: any) {
        console.error("[v0] Debug page error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDebugData()
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Starter Plan Limits Debug</h1>
          <p className="text-red-400">Please log in to view debug data</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Starter Plan Limits Debug</h1>
          <p className="text-gray-400">Loading debug data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Starter Plan Limits Debug</h1>
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    )
  }

  const isCorrect =
    debugData?.actualBundleLimit === debugData?.expectedBundleLimit &&
    debugData?.actualVideoLimit === debugData?.expectedVideoLimit

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold mb-8">Starter Plan Limits Debug</h1>

        {/* Status Overview */}
        <div
          className={`p-6 rounded-lg border-2 ${isCorrect ? "bg-green-950/20 border-green-500" : "bg-red-950/20 border-red-500"}`}
        >
          <h2 className="text-xl font-bold mb-4">{isCorrect ? "✅ Limits are CORRECT" : "❌ Limits are INCORRECT"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Bundle Limit</p>
              <p className="text-2xl font-bold">
                Expected: {debugData?.expectedBundleLimit} | Actual: {debugData?.actualBundleLimit}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Video Per Bundle Limit</p>
              <p className="text-2xl font-bold">
                Expected: {debugData?.expectedVideoLimit} | Actual: {debugData?.actualVideoLimit}
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">User Info</h2>
          <div className="space-y-2 font-mono text-sm">
            <p>
              <span className="text-gray-400">UID:</span> {debugData?.userUid}
            </p>
            <p>
              <span className="text-gray-400">Email:</span> {debugData?.userEmail}
            </p>
          </div>
        </div>

        {/* Membership Status */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Membership Status API Response</h2>
          <pre className="bg-black p-4 rounded overflow-auto text-xs">
            {JSON.stringify(debugData?.membershipStatus, null, 2)}
          </pre>
        </div>

        {/* freeUsers Document */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">freeUsers Firestore Document</h2>
          <pre className="bg-black p-4 rounded overflow-auto text-xs">
            {JSON.stringify(debugData?.freeUsersDoc, null, 2)}
          </pre>
        </div>

        {/* Tier Limits from Hook/API */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Tier Limits (from useFreeTierLimits hook)</h2>
          <pre className="bg-black p-4 rounded overflow-auto text-xs">
            {JSON.stringify(debugData?.freeTierLimits, null, 2)}
          </pre>
        </div>

        {/* Bundle Limits API */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Bundle Limits API Response</h2>
          <pre className="bg-black p-4 rounded overflow-auto text-xs">
            {JSON.stringify(debugData?.bundleLimitsAPI, null, 2)}
          </pre>
        </div>

        {/* Tier Info API (used by add-content) */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Tier Info API (used by add-content endpoint)</h2>
          <pre className="bg-black p-4 rounded overflow-auto text-xs">
            {JSON.stringify(debugData?.tierInfoAPI, null, 2)}
          </pre>
        </div>

        {/* Diagnosis */}
        <div className="bg-blue-950/20 border-2 border-blue-500 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Diagnosis</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Issue:</strong> Starter plan users should have 5 bundle limit and 15 video per bundle limit
            </p>
            <p>
              <strong>Current Status:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                Bundle Limit: {debugData?.actualBundleLimit} (should be {debugData?.expectedBundleLimit})
              </li>
              <li>
                Video Limit: {debugData?.actualVideoLimit} (should be {debugData?.expectedVideoLimit})
              </li>
            </ul>
            <p className="mt-4">
              <strong>Possible Causes:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>freeUsers document not updated with Starter tier limits</li>
              <li>Membership status not returning correct tier</li>
              <li>Tier service not recognizing Starter plan subscription</li>
              <li>APIs still using hardcoded FREE tier limits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
