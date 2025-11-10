"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  Globe,
  CheckCircle,
  AlertCircle,
  Lock,
  ExternalLink,
  Copy,
  RefreshCw,
  Trash2,
  Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"

type DomainStatus = "pending" | "verifying" | "active" | "failed" | "removed"
type SSLStatus = "pending" | "active" | "error"

export default function CustomDomainPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [removing, setRemoving] = useState(false)

  const [isFacelessprenuer, setIsFacelessprenuer] = useState(false)
  const [domainInput, setDomainInput] = useState("")
  const [currentDomain, setCurrentDomain] = useState<any>(null)
  const [dnsInstructions, setDnsInstructions] = useState<any>(null)

  useEffect(() => {
    if (user) {
      checkMembership()
      fetchCurrentDomain()
    }
  }, [user])

  const checkMembership = async () => {
    if (!user) return

    try {
      console.log("[v0] Checking membership from memberships collection")
      const membershipDoc = await getDoc(doc(db, "memberships", user.uid))

      if (membershipDoc.exists()) {
        const membershipData = membershipDoc.data()
        const plan = membershipData.plan
        const isActive = membershipData.isActive === true
        const status = membershipData.status

        console.log("[v0] Membership data:", { plan, isActive, status })

        // Check if user is facelessprenuer with active subscription
        const isPro = plan === "facelessprenuer" && (isActive || status === "trialing")

        console.log("[v0] Facelessprenuer check result:", isPro)
        setIsFacelessprenuer(isPro)
      } else {
        console.log("[v0] No membership document found")
        setIsFacelessprenuer(false)
      }
    } catch (error) {
      console.error("[v0] Error checking membership:", error)
      setIsFacelessprenuer(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentDomain = async () => {
    if (!user) return

    try {
      console.log("[v0] Fetching current domain status")
      const token = await user.getIdToken()
      const response = await fetch("/api/custom-domain/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Domain status response:", data)

        if (data.domain) {
          setCurrentDomain({
            ...data.domain,
            domainId: data.domain.id || data.domainId,
          })
        } else {
          console.log("[v0] No active domain found")
          setCurrentDomain(null)
        }
      } else {
        console.log("[v0] No domain configured (status endpoint returned non-OK)")
        setCurrentDomain(null)
      }
    } catch (error) {
      console.error("[v0] Error fetching domain:", error)
      setCurrentDomain(null)
    }
  }

  const handleAddDomain = async () => {
    if (!domainInput.trim()) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain name",
        variant: "destructive",
      })
      return
    }

    setAdding(true)

    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/custom-domain/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: domainInput.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add domain")
      }

      setCurrentDomain({
        domain: data.domain,
        status: "pending",
        sslStatus: "pending",
        verificationToken: data.verificationToken,
        isApex: data.isApex,
        domainId: data.domainId,
      })
      setDnsInstructions(data.dnsInstructions)
      setDomainInput("")

      toast({
        title: "Domain added",
        description: "Follow the DNS instructions below to verify your domain",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add domain",
        variant: "destructive",
      })
    } finally {
      setAdding(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!currentDomain) return

    setVerifying(true)

    try {
      const token = await user?.getIdToken()
      const response = await fetch("/api/custom-domain/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domainId: currentDomain.domainId || currentDomain.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verification failed")
      }

      if (data.verified) {
        setCurrentDomain({
          ...currentDomain,
          status: "active",
          verified: true,
          sslStatus: "active",
        })
        toast({
          title: "Domain verified!",
          description: "Your custom domain is now active",
        })
      } else {
        toast({
          title: "Verification pending",
          description: data.message || "DNS records not found yet. Please wait a few minutes.",
          variant: "default",
        })
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify domain",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (
      !confirm("Are you sure you want to remove your custom domain? Your storefront will return to the default URL.")
    ) {
      return
    }

    setRemoving(true)

    try {
      console.log("[v0] Removing domain:", currentDomain)
      const token = await user?.getIdToken()

      const response = await fetch("/api/custom-domain/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domainId: currentDomain.domainId || currentDomain.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove domain")
      }

      console.log("[v0] Domain removed successfully")
      setCurrentDomain(null)
      setDnsInstructions(null)

      toast({
        title: "Domain removed",
        description: "Your custom domain has been removed",
      })
    } catch (error: any) {
      console.error("[v0] Error removing domain:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove domain",
        variant: "destructive",
      })
    } finally {
      setRemoving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "DNS record copied to clipboard",
    })
  }

  const getStatusBadge = (status: DomainStatus) => {
    switch (status) {
      case "active":
        return (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Active</span>
          </div>
        )
      case "pending":
      case "verifying":
        return (
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Pending Verification</span>
          </div>
        )
      case "failed":
        return (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Verification Failed</span>
          </div>
        )
      default:
        return null
    }
  }

  const getSSLStatusBadge = (sslStatus: SSLStatus, sslError?: string | null) => {
    switch (sslStatus) {
      case "active":
        return (
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">SSL Active</span>
          </div>
        )
      case "pending":
        return (
          <div className="flex items-center gap-2 text-amber-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">SSL Provisioning...</span>
          </div>
        )
      case "error":
        return (
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">SSL Error</span>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (!isFacelessprenuer) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-zinc-800/50">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Custom Domain</h1>
            <p className="text-zinc-400">Use your own domain for your storefront</p>
          </div>
        </div>

        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <Lock className="h-8 w-8 text-zinc-400" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h3 className="text-xl font-semibold text-white">Facelessprenuer Required</h3>
              <p className="text-zinc-400">
                Custom domains are available exclusively for Facelessprenuer members. Upgrade to use your own branded
                domain.
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/upgrade")}
              className="bg-white hover:bg-gray-100 text-black font-medium px-8"
            >
              Upgrade to Facelessprenuer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-zinc-800/50">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Custom Domain</h1>
          <p className="text-zinc-400">Use your own domain for your storefront</p>
        </div>
      </div>

      {!currentDomain ? (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Add Custom Domain</CardTitle>
            <CardDescription>Connect your own domain to create a fully branded storefront experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="domain">Your Domain</Label>
              <div className="flex gap-3">
                <Input
                  id="domain"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="shop.mybrand.com or mybrand.com"
                  className="bg-zinc-800/50 border-zinc-700 text-white flex-1"
                  disabled={adding}
                />
                <Button
                  onClick={handleAddDomain}
                  disabled={adding || !domainInput.trim()}
                  className="bg-white hover:bg-gray-100 text-black"
                >
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Domain"
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                You can use either an apex domain (mybrand.com) or a subdomain (shop.mybrand.com)
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <div className="space-y-1">
                  <p className="text-blue-200 text-sm font-medium">What happens next?</p>
                  <p className="text-blue-300/80 text-xs leading-relaxed">
                    After adding your domain, you'll receive DNS configuration instructions. Add those records to your
                    domain provider, then we'll verify and activate your custom domain.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Domain</CardTitle>
                  <CardDescription>Your custom domain configuration</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(currentDomain.status)}
                  {currentDomain.status === "active" &&
                    getSSLStatusBadge(currentDomain.sslStatus, currentDomain.sslError)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-zinc-400" />
                  <span className="text-white font-medium">{currentDomain.domain}</span>
                </div>
                <div className="flex gap-2">
                  {currentDomain.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${currentDomain.domain}`, "_blank")}
                      className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveDomain}
                    disabled={removing}
                    className="border-red-700 hover:bg-red-900/20 bg-transparent text-red-400"
                  >
                    {removing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {currentDomain.sslStatus === "error" && currentDomain.sslError && (
                <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/30">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-red-200 text-sm font-medium">SSL Certificate Error</p>
                      <p className="text-red-300/80 text-xs leading-relaxed">{currentDomain.sslError}</p>
                    </div>
                  </div>
                </div>
              )}

              {currentDomain.status !== "active" && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">DNS Configuration</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVerifyDomain}
                        disabled={verifying}
                        className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Check Verification
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-sm text-zinc-400">
                      Add these DNS records to your domain provider to verify ownership and activate your custom domain:
                    </p>

                    <div className="space-y-3">
                      {/* TXT Record */}
                      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-400">TXT Record (Verification)</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(currentDomain.verificationToken)}
                            className="h-7 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Value
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-zinc-500 text-xs">Type</span>
                            <p className="text-white font-mono">TXT</p>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-xs">Name</span>
                            <p className="text-white font-mono">_vercel-challenge</p>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-xs">Value</span>
                            <p className="text-white font-mono truncate">{currentDomain.verificationToken}</p>
                          </div>
                        </div>
                      </div>

                      {/* CNAME or A Record */}
                      <div className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-400">
                            {currentDomain?.domain?.split(".").length === 2 ? "A Record" : "CNAME Record"} (Routing)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                currentDomain?.domain?.split(".").length === 2 ? "76.76.21.21" : "cname.vercel-dns.com",
                              )
                            }
                            className="h-7 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Value
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-zinc-500 text-xs">Type</span>
                            <p className="text-white font-mono">
                              {currentDomain?.domain?.split(".").length === 2 ? "A" : "CNAME"}
                            </p>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-xs">Name</span>
                            <p className="text-white font-mono">
                              {currentDomain?.domain?.split(".").length === 2
                                ? "@"
                                : currentDomain?.domain?.split(".")[0]}
                            </p>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-xs">Value</span>
                            <p className="text-white font-mono">
                              {currentDomain?.domain?.split(".").length === 2 ? "76.76.21.21" : "cname.vercel-dns.com"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-amber-200 text-sm font-medium">DNS Propagation</p>
                        <p className="text-amber-300/80 text-xs leading-relaxed">
                          DNS changes can take 5-60 minutes to propagate. After adding the records to your domain
                          provider, click "Check Verification" to verify your domain.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentDomain.status === "active" && (
                <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-500/30">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-emerald-200 text-sm font-medium">Domain Active</p>
                      <p className="text-emerald-300/80 text-xs leading-relaxed">
                        Your custom domain is now live!
                        {currentDomain.sslStatus === "active" &&
                          " SSL certificate is active and your site is fully secured."}
                        {currentDomain.sslStatus === "pending" &&
                          " SSL certificate is being provisioned and may take up to 24 hours."}
                        {currentDomain.sslStatus === "error" &&
                          " There is an issue with your SSL certificate - please see error above."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
