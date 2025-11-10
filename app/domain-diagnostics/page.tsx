"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function DomainDiagnosticsPage() {
  const { user } = useFirebaseAuth()
  const [loading, setLoading] = useState(true)
  const [rawFirebaseData, setRawFirebaseData] = useState<any>(null)
  const [apiTestResult, setApiTestResult] = useState<any>(null)
  const [testDomain, setTestDomain] = useState("testmassclip.duckdns.org")
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    const fetchRawData = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        console.log("[v0] Fetching raw Firebase data for user:", user.uid)
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          const data = userDocSnap.data()
          console.log("[v0] Raw Firebase data:", data)
          setRawFirebaseData(data)
        } else {
          console.log("[v0] No Firebase document found")
          setRawFirebaseData(null)
        }
      } catch (error) {
        console.error("[v0] Error fetching Firebase data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRawData()
  }, [user])

  const testAddDomain = async () => {
    setTesting(true)
    setApiTestResult(null)

    try {
      console.log("[v0] Testing domain add with:", testDomain)
      const response = await fetch("/api/custom-domain/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: testDomain }),
      })

      const data = await response.json()
      console.log("[v0] API Response:", { status: response.status, data })

      setApiTestResult({
        success: response.ok,
        status: response.status,
        data,
      })
    } catch (error: any) {
      console.error("[v0] API Test error:", error)
      setApiTestResult({
        success: false,
        error: error.message,
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertDescription>Please log in to view diagnostics</AlertDescription>
        </Alert>
      </div>
    )
  }

  const planFromFirebase = rawFirebaseData?.plan || "not found"
  const membershipTierFromFirebase = rawFirebaseData?.membershipTier || "not found"
  const statusFromFirebase = rawFirebaseData?.status || "not found"
  const allowedPlans = ["facelessprenuer"]
  const isAllowed = allowedPlans.includes(planFromFirebase)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Domain Diagnostics v2</h1>
          <p className="text-muted-foreground">Fresh diagnostics without any data transformation</p>
        </div>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-sm">{user.uid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span>{user.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Raw Firebase Data */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Firebase Data</CardTitle>
            <CardDescription>Directly from Firestore without any transformation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">plan field:</span>
                <Badge variant={planFromFirebase === "facelessprenuer" ? "default" : "destructive"}>
                  {planFromFirebase}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">membershipTier field:</span>
                <Badge variant="outline">{membershipTierFromFirebase}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">status field:</span>
                <Badge variant="outline">{statusFromFirebase}</Badge>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-2">Full Firebase Document:</p>
              <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(rawFirebaseData, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Permission Check */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Domain Permission Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Your Plan (from Firebase):</span>
                <Badge variant={isAllowed ? "default" : "destructive"}>{planFromFirebase}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Custom Domain Access:</span>
                <Badge variant={isAllowed ? "default" : "destructive"}>{isAllowed ? "Allowed" : "Denied"}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Allowed Plans:</span>
                <div className="flex gap-2">
                  {allowedPlans.map((plan) => (
                    <Badge key={plan} variant="outline">
                      {plan}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {!isAllowed && (
              <Alert>
                <AlertDescription>
                  Your plan "{planFromFirebase}" is not in the allowed list. Only "facelessprenuer" can use custom
                  domains.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* API Test */}
        <Card>
          <CardHeader>
            <CardTitle>Test API Endpoint</CardTitle>
            <CardDescription>Test the /api/custom-domain/add endpoint</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={testDomain}
                onChange={(e) => setTestDomain(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border rounded-md"
                placeholder="your-domain.com"
              />
              <Button onClick={testAddDomain} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Add"}
              </Button>
            </div>

            {apiTestResult && (
              <div className="p-4 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={apiTestResult.success ? "default" : "destructive"}>
                    {apiTestResult.success ? "Success" : "Failed"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Status: {apiTestResult.status}</span>
                </div>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(apiTestResult.data || apiTestResult.error, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>What to check:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              1. <strong>Raw Firebase Data</strong> - Does it show "facelessprenuer"?
            </p>
            <p>
              2. <strong>Permission Check</strong> - Does it say "Allowed"?
            </p>
            <p>
              3. <strong>API Test</strong> - Click "Test Add" to see what the API returns
            </p>
            <p className="pt-2 text-muted-foreground">
              This page reads directly from Firebase with zero transformations. If the plan shows anything other than
              what's in your Firebase database, there's a caching issue.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
