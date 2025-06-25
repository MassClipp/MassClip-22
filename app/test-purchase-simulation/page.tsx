"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Play, CheckCircle, AlertCircle, Database, Zap } from "lucide-react"
import Link from "next/link"

export default function PurchaseSimulationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testFirebaseConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🔥 [Test] Testing Firebase connection...")

      const response = await fetch("/api/test/firebase-connection")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Firebase test failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Test] Firebase test result:", data)
    } catch (error) {
      console.error("❌ [Test] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to test Firebase")
    } finally {
      setLoading(false)
    }
  }

  const testSimpleVerification = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 [Test] Testing simple verification...")

      const response = await fetch("/api/test/simple-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Simple verification failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Test] Simple verification successful:", data)
    } catch (error) {
      console.error("❌ [Test] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to test simple verification")
    } finally {
      setLoading(false)
    }
  }

  const simulatePurchase = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 [Simulation] Starting purchase simulation...")

      const response = await fetch("/api/test/simulate-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Simulation failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Simulation] Purchase simulation successful:", data)
    } catch (error) {
      console.error("❌ [Simulation] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to simulate purchase")
    } finally {
      setLoading(false)
    }
  }

  const testPurchaseVerification = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 [Simulation] Testing purchase verification...")

      const response = await fetch("/api/test/verify-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: "cs_test_simulation_123",
          productBoxId: "test-product-box-123",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Verification failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Simulation] Purchase verification successful:", data)
    } catch (error) {
      console.error("❌ [Simulation] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to verify purchase")
    } finally {
      setLoading(false)
    }
  }

  const testRealVerification = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 [Simulation] Testing REAL purchase verification...")

      const response = await fetch("/api/purchase/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: "cs_test_simulation_123",
          productBoxId: "test-product-box-123",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Real verification failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Simulation] Real purchase verification successful:", data)
    } catch (error) {
      console.error("❌ [Simulation] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to verify real purchase")
    } finally {
      setLoading(false)
    }
  }

  const testPurchasesAPI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 [Simulation] Testing purchases API...")

      const response = await fetch("/api/user/purchases")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "API failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Simulation] Purchases API successful:", data)
    } catch (error) {
      console.error("❌ [Simulation] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  const setupTestData = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 [Simulation] Setting up test data...")

      const response = await fetch("/api/test/setup-test-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Setup failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Simulation] Test data setup successful:", data)
    } catch (error) {
      console.error("❌ [Simulation] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to setup test data")
    } finally {
      setLoading(false)
    }
  }

  const checkDatabase = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🔍 [Test] Checking database...")

      const response = await fetch("/api/test/check-database")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Database check failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Test] Database check result:", data)
    } catch (error) {
      console.error("❌ [Test] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to check database")
    } finally {
      setLoading(false)
    }
  }

  const forceSetupData = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🔧 [Test] Force setting up data...")

      const response = await fetch("/api/test/force-setup-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Force setup failed" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ [Test] Force setup successful:", data)
    } catch (error) {
      console.error("❌ [Test] Error:", error)
      setError(error instanceof Error ? error.message : "Failed to force setup data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-zinc-900/90 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Purchase System Testing</CardTitle>
            <CardDescription className="text-zinc-400">
              Test various purchase-related API endpoints to debug issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Tests */}
            <div className="space-y-2">
              <h3 className="text-white font-medium">Basic Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button onClick={testFirebaseConnection} disabled={loading} className="w-full" variant="default">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  Test Firebase Connection
                </Button>

                <Button onClick={checkDatabase} disabled={loading} className="w-full" variant="default">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                  Check Database
                </Button>

                <Button onClick={forceSetupData} disabled={loading} className="w-full" variant="default">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  Force Setup Data
                </Button>

                <Button onClick={testSimpleVerification} disabled={loading} className="w-full" variant="default">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  Test Simple Verification
                </Button>
              </div>
            </div>

            {/* Advanced Tests */}
            <div className="space-y-2">
              <h3 className="text-white font-medium">Advanced Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Button onClick={setupTestData} disabled={loading} className="w-full" variant="outline">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Setup Test Data
                </Button>

                <Button onClick={simulatePurchase} disabled={loading} className="w-full" variant="outline">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Simulate Purchase
                </Button>

                <Button onClick={testPurchaseVerification} disabled={loading} className="w-full" variant="outline">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Verification (Mock)
                </Button>

                <Button onClick={testRealVerification} disabled={loading} className="w-full" variant="outline">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Real Verification
                </Button>

                <Button onClick={testPurchasesAPI} disabled={loading} className="w-full" variant="outline">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Purchases API
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/dashboard/purchases">View Purchases Page</Link>
              </Button>
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/debug-purchases">Debug Purchases</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {(result || error) && (
          <Card className="bg-zinc-900/90 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {error ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Test Failed
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Test Successful
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <p className="text-red-400 font-medium">Error:</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              ) : (
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <p className="text-green-400 font-medium">Result:</p>
                  <pre className="text-green-300 text-sm mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
