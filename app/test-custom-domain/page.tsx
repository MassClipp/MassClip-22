"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"
import { auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"

export default function TestCustomDomainPage() {
  const [user, loading] = useAuthState(auth)
  const [testDomain, setTestDomain] = useState("test-shop.example.com")
  const [domainId, setDomainId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("idle")
  const [message, setMessage] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])

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
        setMessage("Domain added successfully! Waiting 30 seconds for DNS verification...")
        addLog(`✓ Domain added with ID: ${data.domainId}`)
        addLog(`Verification token: ${data.verificationToken}`)
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
        setMessage("Domain verified successfully!")
        addLog(`✓ Domain verified: ${data.domain}`)
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
        setMessage(`SSL check complete: ${data.updatedCount} domains updated`)
        addLog(`✓ SSL check: ${JSON.stringify(data)}`)
      } else {
        setMessage("SSL check failed")
        addLog(`✗ SSL check failed: ${data.error}`)
      }
    } catch (error: any) {
      setMessage(error.message)
      addLog(`✗ Exception: ${error.message}`)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "loading":
      case "verifying":
      case "checking-ssl":
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
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
            <Input
              value={testDomain}
              onChange={(e) => setTestDomain(e.target.value)}
              placeholder="test-shop.example.com"
              disabled={status !== "idle"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use patterns: test-*.example.com, *.test, or localhost-*
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddDomain} disabled={status !== "idle" && status !== "error"}>
              1. Add Domain
            </Button>
            <Button onClick={handleVerifyDomain} disabled={!domainId || status === "verified"} variant="secondary">
              2. Verify Domain (after 30s)
            </Button>
            <Button onClick={handleCheckSSL} variant="outline" disabled={status !== "verified"}>
              3. Check SSL (after 1min)
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
              <p className="text-muted-foreground">Click "Verify Domain" - auto-passes after 30 seconds</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">1min</Badge>
            <div>
              <p className="font-medium">SSL Provisioning</p>
              <p className="text-muted-foreground">Click "Check SSL" - auto-provisions after 1 minute</p>
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
