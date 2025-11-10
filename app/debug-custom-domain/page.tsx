"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-firebase-auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Loader2, Trash2 } from "lucide-react"

interface DebugData {
  auth: {
    isAuthenticated: boolean
    userId: string | null
    email: string | null
  }
  userData: {
    exists: boolean
    plan: string | null
    membershipTier: string | null
    status: string | null
  }
  membership: {
    allowedPlans: string[]
    userPlan: string | null
    isAllowed: boolean
  }
  domain: {
    hasExisting: boolean
    existingDomain: string | null
    domainId: string | null
    status: string | null
  }
  apiTests: {
    status: { success: boolean; error: string | null; response?: any }
    add: { success: boolean; error: string | null; response?: any }
  }
}

export default function DebugCustomDomainPage() {
  const { user, loading: authLoading } = useAuth()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [testDomain, setTestDomain] = useState("testmassclip.duckdns.org")
  const [existingDomains, setExistingDomains] = useState<any[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    console.log("[v0] Running diagnostics...")

    try {
      if (!user) {
        console.log("[v0] No user found")
        return
      }

      const token = await user.getIdToken()
      console.log("[v0] Got auth token")

      console.log("[v0] Fetching membership data from Firebase...")
      const membershipDoc = await getDoc(doc(db, "memberships", user.uid))
      const userData = membershipDoc.exists() ? membershipDoc.data() : {}
      console.log("[v0] Membership data from Firebase:", userData)

      console.log("[v0] Fetching existing domains...")
      const domainsRef = collection(db, "customDomains")
      const domainsQuery = query(domainsRef, where("userId", "==", user.uid))
      const domainsSnap = await getDocs(domainsQuery)
      const domains = domainsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      console.log("[v0] Found domains:", domains)
      setExistingDomains(domains)

      console.log("[v0] Testing status endpoint...")
      const statusRes = await fetch("/api/custom-domain/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const statusData = statusRes.ok ? await statusRes.json() : { error: await statusRes.text() }
      console.log("[v0] Status response:", statusData)

      const allowedPlans = ["facelessprenuer"]
      const userPlan = userData.plan || userData.membershipTier || "free"

      setDebugData({
        auth: {
          isAuthenticated: !!user,
          userId: user?.uid || null,
          email: user?.email || null,
        },
        userData: {
          exists: membershipDoc.exists(),
          plan: userData.plan || null,
          membershipTier: userData.membershipTier || null,
          status: userData.status || null,
        },
        membership: {
          allowedPlans,
          userPlan,
          isAllowed: allowedPlans.includes(userPlan),
        },
        domain: {
          hasExisting: statusData.hasDomain || false,
          existingDomain: statusData.domain?.domain || null,
          domainId: statusData.domain?.id || null,
          status: statusData.domain?.status || null,
        },
        apiTests: {
          status: {
            success: statusRes.ok,
            error: statusRes.ok ? null : statusData.error || `HTTP ${statusRes.status}`,
            response: statusData,
          },
          add: { success: false, error: "Not tested yet" },
        },
      })
    } catch (error: any) {
      console.error("[v0] Diagnostics error:", error)
    } finally {
      setLoading(false)
    }
  }

  const testAddDomain = async () => {
    if (!user) return

    try {
      console.log(`[v0] Testing add domain: ${testDomain}`)
      const token = await user.getIdToken()
      const res = await fetch("/api/custom-domain/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: testDomain }),
      })

      const data = res.ok ? await res.json() : { error: await res.text() }
      console.log("[v0] Add domain response:", data)

      setDebugData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          apiTests: {
            ...prev.apiTests,
            add: {
              success: res.ok,
              error: res.ok ? null : data.error || `HTTP ${res.status}`,
              response: data,
            },
          },
        }
      })

      if (res.ok) {
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
      console.error("[v0] Test add domain error:", error)
      setDebugData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          apiTests: {
            ...prev.apiTests,
            add: { success: false, error: error.message },
          },
        }
      })
    }
  }

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
        const domainsRef = collection(db, "customDomains")
        const domainsQuery = query(domainsRef, where("userId", "==", user.uid))
        const domainsSnap = await getDocs(domainsQuery)
        const domains = domainsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setExistingDomains(domains)

        await runDiagnostics()
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

  useEffect(() => {
    if (user && !authLoading) {
      runDiagnostics()
    }
  }, [user, authLoading])

  if (authLoading || !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  const activeDomains = existingDomains.filter((d) => d.status !== "removed")

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Custom Domain Debug Panel</h1>
        <p className="text-muted-foreground">Diagnose custom domain configuration issues</p>
      </div>

      <div className="mb-6 flex gap-4">
        <Button onClick={runDiagnostics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Run Diagnostics
        </Button>
      </div>

      {debugData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {activeDomains.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                Your Existing Domains
              </CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugData.auth.isAuthenticated ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Authenticated:</span>
                <Badge variant={debugData.auth.isAuthenticated ? "default" : "destructive"}>
                  {debugData.auth.isAuthenticated ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <code className="text-xs">{debugData.auth.userId || "N/A"}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-sm">{debugData.auth.email || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugData.userData.exists ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                User Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <Badge>{debugData.userData.plan || "N/A"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membership Tier:</span>
                <Badge variant="outline">{debugData.userData.membershipTier || "N/A"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary">{debugData.userData.status || "N/A"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugData.membership.isAllowed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Membership Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Plan:</span>
                <Badge variant={debugData.membership.isAllowed ? "default" : "destructive"}>
                  {debugData.membership.userPlan}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Is Allowed:</span>
                <Badge variant={debugData.membership.isAllowed ? "default" : "destructive"}>
                  {debugData.membership.isAllowed ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground">Allowed Plans:</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {debugData.membership.allowedPlans.map((plan) => (
                    <Badge key={plan} variant="outline">
                      {plan}
                    </Badge>
                  ))}
                </div>
              </div>
              {!debugData.membership.isAllowed && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Issue:</strong> Your plan &quot;{debugData.membership.userPlan}&quot; is not in the allowed
                    list. This is why you&apos;re getting a 403 error.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugData.domain.hasExisting ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                Existing Domain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Has Domain:</span>
                <Badge variant={debugData.domain.hasExisting ? "default" : "secondary"}>
                  {debugData.domain.hasExisting ? "Yes" : "No"}
                </Badge>
              </div>
              {debugData.domain.hasExisting && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domain:</span>
                    <code className="text-sm">{debugData.domain.existingDomain}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge>{debugData.domain.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domain ID:</span>
                    <code className="text-xs">{debugData.domain.domainId}</code>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Endpoint Tests</CardTitle>
              <CardDescription>Test API responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">GET /api/custom-domain/status</span>
                  <Badge variant={debugData.apiTests.status.success ? "default" : "destructive"}>
                    {debugData.apiTests.status.success ? "Success" : "Failed"}
                  </Badge>
                </div>
                {debugData.apiTests.status.error && (
                  <p className="text-sm text-red-600 mt-2">{debugData.apiTests.status.error}</p>
                )}
              </div>

              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">POST /api/custom-domain/add</span>
                  <Badge
                    variant={
                      debugData.apiTests.add.error === "Not tested yet"
                        ? "outline"
                        : debugData.apiTests.add.success
                          ? "default"
                          : "destructive"
                    }
                  >
                    {debugData.apiTests.add.success
                      ? "Success"
                      : debugData.apiTests.add.error === "Not tested yet"
                        ? "Not Tested"
                        : "Failed"}
                  </Badge>
                </div>
                {debugData.apiTests.add.error && debugData.apiTests.add.error !== "Not tested yet" && (
                  <p className="text-sm text-red-600 mt-2">{debugData.apiTests.add.error}</p>
                )}
                {debugData.apiTests.add.response && (
                  <details className="mt-2">
                    <summary className="text-sm cursor-pointer text-muted-foreground">View Response</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(debugData.apiTests.add.response, null, 2)}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={testDomain}
                    onChange={(e) => setTestDomain(e.target.value)}
                    placeholder="testmassclip.duckdns.org"
                    className="flex-1 px-3 py-1 text-sm border rounded-md"
                  />
                  <Button size="sm" onClick={testAddDomain}>
                    Test Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
