"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, RefreshCw, Search, Globe, CheckCircle, AlertTriangle, Trash2 } from "lucide-react"

interface CustomDomain {
  id: string
  domain: string
  userId: string
  userEmail?: string
  username?: string
  verified: boolean
  status: string
  sslStatus: string
  sslError?: string
  isApex: boolean
  createdAt: string
  verifiedAt?: string
  lastChecked: string
  lastHealthCheck?: string
  healthStatus?: string
  healthError?: string
  isHealthy?: boolean
}

interface DashboardStats {
  totalDomains: number
  verifiedDomains: number
  pendingDomains: number
  failedDomains: number
  sslActive: number
  sslPending: number
  sslError: number
  healthyDomains: number
  unhealthyDomains: number
}

export default function CustomDomainsAdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [filteredDomains, setFilteredDomains] = useState<CustomDomain[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && !authLoading && !user) {
      router.push("/login?redirect=/admin/custom-domains")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetchDomains()
    }
  }, [user])

  useEffect(() => {
    filterDomains()
  }, [domains, searchQuery, statusFilter])

  const fetchDomains = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await user?.getIdToken()
      const response = await fetch("/api/admin/custom-domains", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch domains: ${response.statusText}`)
      }

      const data = await response.json()
      setDomains(data.domains)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch domains")
      console.error("Error fetching domains:", err)
    } finally {
      setLoading(false)
    }
  }

  const filterDomains = () => {
    let filtered = [...domains]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.domain.toLowerCase().includes(query) ||
          d.userEmail?.toLowerCase().includes(query) ||
          d.username?.toLowerCase().includes(query),
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => {
        switch (statusFilter) {
          case "verified":
            return d.verified && d.status === "active"
          case "pending":
            return !d.verified && d.status === "pending"
          case "failed":
            return d.status === "failed" || d.healthStatus === "down"
          case "ssl-pending":
            return d.sslStatus === "pending"
          case "ssl-error":
            return d.sslStatus === "error"
          default:
            return true
        }
      })
    }

    setFilteredDomains(filtered)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDomains()
    setRefreshing(false)
  }

  const handleManualVerify = async (domainId: string) => {
    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/admin/custom-domains/${domainId}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to verify domain")
      }

      await fetchDomains()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to verify domain")
    }
  }

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to remove this domain?")) {
      return
    }

    try {
      const token = await user?.getIdToken()
      const response = await fetch(`/api/admin/custom-domains/${domainId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to remove domain")
      }

      await fetchDomains()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove domain")
    }
  }

  const getStatusBadge = (domain: CustomDomain) => {
    if (domain.verified && domain.status === "active") {
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
    }
    if (domain.status === "pending") {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
    }
    if (domain.status === "failed" || domain.healthStatus === "down") {
      return <Badge variant="destructive">Failed</Badge>
    }
    return <Badge variant="secondary">{domain.status}</Badge>
  }

  const getSSLBadge = (sslStatus: string, sslError?: string) => {
    if (sslStatus === "active") {
      return <Badge className="bg-green-500 hover:bg-green-600">SSL Active</Badge>
    }
    if (sslStatus === "pending") {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">SSL Pending</Badge>
    }
    if (sslStatus === "error") {
      return (
        <Badge variant="destructive" title={sslError || "SSL Error"}>
          SSL Error
        </Badge>
      )
    }
    return <Badge variant="secondary">No SSL</Badge>
  }

  const getHealthBadge = (domain: CustomDomain) => {
    if (!domain.lastHealthCheck) {
      return <Badge variant="secondary">Not Checked</Badge>
    }
    if (domain.isHealthy) {
      return <Badge className="bg-green-500 hover:bg-green-600">Healthy</Badge>
    }
    return (
      <Badge variant="destructive" title={domain.healthError || "Health check failed"}>
        Unhealthy
      </Badge>
    )
  }

  if (loading && !domains.length) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Custom Domains Admin</h1>
        <p className="text-muted-foreground">Monitor and manage all custom domains across users</p>
      </div>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDomains}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.verifiedDomains}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.pendingDomains}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">SSL Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.sslActive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Healthy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.healthyDomains}</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.unhealthyDomains} unhealthy</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>Find and filter custom domains</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by domain, email, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All ({domains.length})
            </Button>
            <Button
              variant={statusFilter === "verified" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("verified")}
            >
              Verified
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === "failed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("failed")}
            >
              Failed
            </Button>
            <Button
              variant={statusFilter === "ssl-pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ssl-pending")}
            >
              SSL Pending
            </Button>
            <Button
              variant={statusFilter === "ssl-error" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ssl-error")}
            >
              SSL Error
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Domains List */}
      <div className="space-y-4">
        {filteredDomains.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No domains found matching your filters
            </CardContent>
          </Card>
        ) : (
          filteredDomains.map((domain) => (
            <Card key={domain.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">{domain.domain}</CardTitle>
                    </div>
                    <CardDescription>
                      User: {domain.userEmail || domain.userId}
                      {domain.username && ` (@${domain.username})`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!domain.verified && (
                      <Button size="sm" variant="outline" onClick={() => handleManualVerify(domain.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleRemoveDomain(domain.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    {getStatusBadge(domain)}
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">SSL</div>
                    {getSSLBadge(domain.sslStatus, domain.sslError)}
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Health</div>
                    {getHealthBadge(domain)}
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Type</div>
                    <Badge variant="outline">{domain.isApex ? "Apex" : "Subdomain"}</Badge>
                  </div>

                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Timestamps</div>
                    <div className="text-xs space-y-1">
                      <div>Created: {new Date(domain.createdAt).toLocaleString()}</div>
                      {domain.verifiedAt && <div>Verified: {new Date(domain.verifiedAt).toLocaleString()}</div>}
                      {domain.lastHealthCheck && (
                        <div>Last Health Check: {new Date(domain.lastHealthCheck).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
