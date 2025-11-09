"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, AlertCircle, RotateCcw, Sparkles, Trash2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"

export default function TestCustomDomainPage() {
  const [user, loading] = useAuthState(auth)
  const [testDomain, setTestDomain] = useState("")
  const [domainId, setDomainId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("idle")
  const [message, setMessage] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const [domainAddedAt, setDomainAddedAt] = useState<number | null>(null)
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null)

  useEffect(() => {
    generateRandomTestDomain()
  }, [])

  const generateRandomTestDomain = () => {
    const randomId = Math.random().toString(36).substring(2, 8)
    setTestDomain(`test-${randomId}.example.com`)
  }

  const resetTest = () => {
    setDomainId(null)
    setStatus("idle")
    setMessage("")
    setLogs([])
    setDomainAddedAt(null)
    setVerifiedAt(null)
    generateRandomTestDomain()
    addLog("🔄 Test reset - ready for new test")
  }

  const addLog = (log: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`])
  }

  const testModeEnabled = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN_TEST_MODE === "true"

  const getAuthToken = async () => {
    if (!user) {
      throw new Error("User not authenticated")
    }
    return await user.getIdToken()
  }

  useEffect(() => {
    if (!domainAddedAt || status === "verified" || status === "error") return

    const elapsed = Date.now() - domainAddedAt
    const timeToVerify = 30000 - elapsed

    if (timeToVerify <= 0) {
      handleVerifyDomain()
      return
    }

    const timer = setTimeout(() => {
      addLog("⏰ 30 seconds elapsed - auto-verifying domain...")
      handleVerifyDomain()
    }, timeToVerify)

    return () => clearTimeout(timer)
  }, [domainAddedAt, status])

  useEffect(() => {
    if (!verifiedAt || status === "error") return

    const elapsed = Date.now() - verifiedAt
    const timeToSSLCheck = 60000 - elapsed

    if (timeToSSLCheck <= 0) {
      handleCheckSSL()
      return
    }

    const timer = setTimeout(() => {
      addLog("⏰ 1 minute elapsed - auto-checking SSL...")
      handleCheckSSL()
    }, timeToSSLCheck)

    return () => clearTimeout(timer)
  }, [verifiedAt, status])

  const handleAddDomain = async () => {
    setStatus("loading")
    addLog(`Adding domain: ${testDomain}`)

    try {
      const token = await getAuthToken()

      const response = await fetch("/api/custom-domain/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: testDomain }),
      })

      const data = await response.json()

      if (data.success) {
        setDomainId(data.domainId)
        setStatus("pending")
        const now = Date.now()
        setDomainAddedAt(now)
        setMessage("Domain added successfully! Auto-verifying in 30 seconds...")
        addLog(`✓ Domain added with ID: ${data.domainId}`)
        addLog(`Verification token: ${data.verificationToken}`)
        addLog(`⏱️ Auto-verification scheduled for 30 seconds from now...`)
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to add domain")
        addLog(`✗ Error: ${data.error}`)
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message)
      addLog(`✗ Exception: ${error.message}`)
    }
  }

  const handleVerifyDomain = async () => {
    if (!domainId) {
      setMessage("No domain to verify")
      return
    }

    setStatus("verifying")
    addLog(`Verifying domain ID: ${domainId}`)

    try {
      const token = await getAuthToken()

      const response = await fetch("/api/custom-domain/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domainId }),
      })

      const data = await response.json()

      if (data.verified) {
        setStatus("verified")
        const now = Date.now()
        setVerifiedAt(now)
        setMessage("Domain verified successfully! Auto-checking SSL in 1 minute...")
        addLog(`✓ Domain verified: ${data.domain}`)
        addLog(`⏱️ Auto SSL check scheduled for 1 minute from now...`)
      } else {
        setStatus("pending")
        setMessage(data.message || "DNS records not found yet. Wait 30 seconds from domain creation.")
        addLog(`○ Verification pending: ${data.message}`)
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message)
      addLog(`✗ Exception: ${error.message}`)
    }
  }

  const handleCheckSSL = async () => {
    setStatus("checking-ssl")
    addLog("Checking SSL status via cron job")

    try {
      const response = await fetch("/api/custom-domain/check-ssl-status", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setStatus("complete")
        setMessage(`SSL check complete: ${data.updatedCount} domains updated`)
        addLog(`✓ SSL check: ${JSON.stringify(data)}`)
        addLog(`🎉 Test complete! Custom domain flow verified successfully.`)
      } else {
        setStatus("ssl-failed")
        setMessage("SSL check failed")
        addLog(`✗ SSL check failed: ${data.error}`)
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message)
      addLog(`✗ Exception: ${error.message}`)
    }
  }

  const handleDeleteDomain = async () => {
    if (!domainId) {
      setMessage("No domain to delete")
      return
    }

    if (!confirm(`Are you sure you want to delete the domain: ${testDomain}?`)) {
      return
    }

    setStatus("deleting")
    addLog(`Deleting domain ID: ${domainId}`)

    try {
      const token = await getAuthToken()

      const response = await fetch("/api/custom-domain/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domainId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage("Domain deleted successfully!")
        addLog(`✓ Domain deleted: ${testDomain}`)
        addLog(`🔄 Resetting test...`)
        // Reset after 1 second to show success message
        setTimeout(() => resetTest(), 1000)
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to delete domain")
        addLog(`✗ Delete error: ${data.error}`)
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message)
      addLog(`✗ Exception: ${error.message}`)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "verified":
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
      case "ssl-failed":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "loading":
      case "verifying":
      case "checking-ssl":
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "deleting":
        return <Trash2 className="h-5 w-5 text-red-500 animate-spin" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            You must be logged in to test custom domains. Please sign in to continue.
          </p>
          <Button onClick={() => (window.location.href = "/login")}>Go to Login</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Custom Domain Test Mode</h1>
        <p className="text-muted-foreground">Test the complete custom domain flow without a real domain</p>
      </div>

      <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-900">
            Authenticated as: <strong>{user.email}</strong>
          </p>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Test Mode Status</h2>
          {testModeEnabled ? (
            <Badge variant="default" className="bg-green-500">
              Enabled
            </Badge>
          ) : (
            <Badge variant="destructive">Disabled</Badge>
          )}
        </div>

        {!testModeEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              Test mode is disabled. Set NEXT_PUBLIC_CUSTOM_DOMAIN_TEST_MODE=true to enable it.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Test Domain</label>
            <div className="flex gap-2">
              <Input
                value={testDomain}
                onChange={(e) => setTestDomain(e.target.value)}
                placeholder="test-shop.example.com"
                disabled={status !== "idle"}
                className="flex-1"
              />
              <Button
                onClick={generateRandomTestDomain}
                disabled={status !== "idle"}
                variant="outline"
                size="icon"
                title="Generate random test domain"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use patterns: test-*.example.com, *.test, or localhost-* (auto-generated)
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleAddDomain} disabled={status !== "idle" && status !== "error"}>
              1. Add Domain
            </Button>
            <Button onClick={handleVerifyDomain} disabled={!domainId || status === "verified"} variant="secondary">
              2. Verify Domain (manual override)
            </Button>
            <Button onClick={handleCheckSSL} variant="outline" disabled={status !== "verified"}>
              3. Check SSL (manual override)
            </Button>
            {domainId && (
              <Button onClick={handleDeleteDomain} disabled={status === "deleting"} variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Domain
              </Button>
            )}
            <Button onClick={resetTest} variant="ghost" className="ml-auto" disabled={status === "loading"}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Test
            </Button>
          </div>

          {message && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {getStatusIcon()}
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Test Timeline</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="outline">0s</Badge>
            <div>
              <p className="font-medium">Add Domain</p>
              <p className="text-muted-foreground">Domain created with pending status</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">30s</Badge>
            <div>
              <p className="font-medium">DNS Verification</p>
              <p className="text-muted-foreground">
                Auto-verifies after 30 seconds (or click button to verify manually)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">1min</Badge>
            <div>
              <p className="font-medium">SSL Provisioning</p>
              <p className="text-muted-foreground">
                Auto-checks after 1 minute from verification (or click button manually)
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No activity yet...</p>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </Card>
    </div>
  )
}
