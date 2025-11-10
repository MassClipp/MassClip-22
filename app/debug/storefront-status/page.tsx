"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface DebugData {
  userDoc: any
  storefrontTabs: any
  customDomain: any
  resolveTest: any
  timestamp: string
}

export default function StorefrontDebugPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    if (!user) {
      setError("No user logged in")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [userDocRes, tabsRes, domainRes] = await Promise.all([
        fetch(`/api/debug/user-doc?userId=${user.uid}`),
        fetch(`/api/storefront-tabs/${user.uid}`),
        fetch(`/api/custom-domain/debug-domain?userId=${user.uid}`),
      ])

      const userDoc = await userDocRes.json()
      const tabs = await tabsRes.json()
      const domain = await domainRes.json()

      // Test custom domain resolution if available
      let resolveTest = null
      if (domain.found && domain.domainData?.domain) {
        const resolveRes = await fetch(`/api/custom-domain/resolve?domain=${domain.domainData.domain}`)
        resolveTest = {
          status: resolveRes.status,
          data: resolveRes.ok ? await resolveRes.json() : await resolveRes.text(),
        }
      }

      setDebugData({
        userDoc,
        storefrontTabs: tabs,
        customDomain: domain,
        resolveTest,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      runDiagnostics()
    }
  }, [user])

  if (!user) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-6">
          <p className="text-muted-foreground">Please log in to view diagnostics</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Storefront Diagnostics</h1>
          <p className="text-muted-foreground mt-1">Debug tab visibility and offline status issues</p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Refresh Diagnostics
        </Button>
      </div>

      {error && (
        <Card className="p-6 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <p className="font-semibold">Error: {error}</p>
          </div>
        </Card>
      )}

      {debugData && (
        <>
          {/* Storefront Status */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">1. Storefront Status</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {debugData.userDoc.storefrontActive ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  Storefront Status: {debugData.userDoc.storefrontActive ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              {!debugData.userDoc.storefrontActive && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-500">Issue Detected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Storefront is marked as OFFLINE in database, but external access may still work if middleware
                        isn't checking this field properly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Tab Configuration */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">2. Tab Configuration</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Total tabs in database: {debugData.storefrontTabs.tabs?.length || 0}
                </p>
                <div className="space-y-2">
                  {debugData.storefrontTabs.tabs?.map((tab: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {tab.enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{tab.name || tab.type}</span>
                        <span className="text-xs text-muted-foreground">({tab.type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-background rounded">Order: {tab.order}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            tab.enabled ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {tab.enabled ? "ENABLED" : "DISABLED"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {debugData.storefrontTabs.tabs?.some((t: any) => !t.enabled) && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-500">Issue Detected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Some tabs are disabled but might still be showing on the storefront if the creator-profile
                        component isn't filtering by enabled status.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Custom Domain */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">3. Custom Domain Status</h2>
            <div className="space-y-3">
              {debugData.customDomain.found ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Domain: {debugData.customDomain.domainData.domain}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium">{debugData.customDomain.domainData.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Verified</p>
                      <p className="font-medium">{debugData.customDomain.domainData.verified ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SSL Status</p>
                      <p className="font-medium">{debugData.customDomain.domainData.sslStatus}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vercel Added</p>
                      <p className="font-medium">
                        {debugData.customDomain.domainData.vercelDomainAdded ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>

                  {debugData.resolveTest && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Resolution Test:</p>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm">
                          Status: <span className="font-mono">{debugData.resolveTest.status}</span>
                        </p>
                        <pre className="text-xs mt-2 overflow-auto">
                          {JSON.stringify(debugData.resolveTest.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {debugData.customDomain.domainData.status === "active" && !debugData.userDoc.storefrontActive && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-500">Configuration Issue</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Custom domain is ACTIVE but storefront is OFFLINE. The middleware should block access when
                            storefrontActive is false.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">No custom domain configured</span>
                </div>
              )}
            </div>
          </Card>

          {/* Raw Data */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Raw Debug Data</h2>
            <pre className="text-xs overflow-auto bg-muted p-4 rounded-lg max-h-96">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </Card>
        </>
      )}
    </div>
  )
}
