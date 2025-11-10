"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Trash2 } from "lucide-react"

export default function DomainDiagnosticsPage() {
  const { user } = useFirebaseAuth()
  const [loading, setLoading] = useState(true)
  const [rawFirebaseData, setRawFirebaseData] = useState<any>(null)
  const [existingDomains, setExistingDomains] = useState<any[]>([])
  const [apiTestResult, setApiTestResult] = useState<any>(null)
  const [testDomain, setTestDomain] = useState("testmassclip.duckdns.org")
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        console.log("[v0] Fetching data for user:", user.uid)

        // Fetch membership data
        const membershipDocRef = doc(db, "memberships", user.uid)
        const membershipDocSnap = await getDoc(membershipDocRef)

        if (membershipDocSnap.exists()) {
          const data = membershipDocSnap.data()
          console.log("[v0] Raw Firebase membership data:", data)
          setRawFirebaseData(data)
        } else {
          console.log("[v0] No membership document found")
          setRawFirebaseData(null)
        }

        const domainsRef = collection(db, "customDomains")
        const domainsQuery = query(domainsRef, where("userId", "==", user.uid))
        const domainsSnap = await getDocs(domainsQuery)

        const domains = domainsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        console.log("[v0] Found existing domains:", domains)
        setExistingDomains(domains)
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const deleteDomain = async (domainId: string) => {
    if (!user) return

    setDeleting(domainId)
    try {
      const token = await user.getIdToken()
      console.log("[v0] Deleting domain:", domainId)

      const response = await fetch("/api/custom-domain/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domainId }),
      })

      const data = await response.json()
      console.log("[v0] Delete response:", { status: response.status, data })

      if (response.ok) {
        // Refresh the domains list
        const domainsRef = collection(db, "customDomains")
        const domainsQuery = query(domainsRef, where("userId", "==", user.uid))
        const domainsSnap = await getDocs(domainsQuery)
        const domains = domainsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setExistingDomains(domains)
      } else {
        alert(`Failed to delete: ${data.error}`)
      }
    } catch (error: any) {
      console.error("[v0] Delete error:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const testAddDomain = async () => {
    setTesting(true)
    setApiTestResult(null)

    try {
      if (!user) {
        setApiTestResult({
          success: false,
          error: "User not authenticated",
        })
        setTesting(false)
        return
      }

      const token = await user.getIdToken()
      console.log("[v0] Testing domain add with:", testDomain, "Token present:", !!token)

      const response = await fetch("/api/custom-domain/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: testDomain }),
      })

      const data = await response.json()
      console.log("[v0] API Response:", { status: response.status, data })

      setApiTestResult({
        success: response.ok,
        status: response.status,
        data,
      })

      if (response.ok) {
        const domainsRef = collection(db, "customDomains")
        const domainsQuery = query(domainsRef, where("userId", "==", user.uid))
        const domainsSnap = await getDocs(domainsQuery)
        const domains = domainsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setExistingDomains(domains)
      }
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

  const activeDomains = existingDomains.filter((d) => d.status !== "removed")

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

        <Card>
          <CardHeader>
            <CardTitle>Your Existing Domains</CardTitle>
            <CardDescription>Custom domains currently in the database</CardDescription>
          </CardHeader>
          <CardContent>
            {activeDomains.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active custom domains found</p>
            ) : (
              <div className="space-y-3">
                {activeDomains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex-1">
                      <p className="font-medium">{domain.domain}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={domain.verified ? "default" : "secondary"}>
                          {domain.verified ? "Verified" : "Pending"}
                        </Badge>
                        <Badge variant="outline">{domain.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(domain.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteDomain(domain.id)}
                      disabled={deleting === domain.id}
                    >
                      {deleting === domain.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {existingDomains.length > activeDomains.length && (
              <p className="text-xs text-muted-foreground mt-3">
                {existingDomains.length - activeDomains.length} removed domain(s) hidden
              </p>
            )}
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
              1. <strong>Existing Domains</strong> - See what domains you already have and remove them if needed
            </p>
            <p>
              2. <strong>Raw Firebase Data</strong> - Does it show "facelessprenuer"?
            </p>
            <p>
              3. <strong>Permission Check</strong> - Does it say "Allowed"?
            </p>
            <p>
              4. <strong>API Test</strong> - Click "Test Add" to see what the API returns
            </p>
            <p className="pt-2 text-muted-foreground">
              This page reads directly from Firebase with zero transformations. If you have an existing domain, remove
              it first before adding a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
