"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ExternalLink, CheckCircle, Clock, CreditCard, Shield, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from "@/hooks/use-firebase-auth"

interface StripeAccountStatus {
  connected: boolean
  fullySetup: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  transfersCapability?: string
  status: string
  account?: {
    stripe_user_id: string
    email: string
    country: string
    business_type: string
    livemode: boolean
    requirements: {
      currently_due: string[]
      past_due: string[]
      pending_verification: string[]
    }
  }
}

export function StripeAccountSetupPrompt() {
  const { user } = useAuth()
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const checkAccountStatus = async (refresh = false) => {
    if (!user) return

    try {
      setRefreshing(refresh)
      if (!refresh) setLoading(true)
      
      console.log(`🔍 Checking account status for user: ${user.uid}`)
      
      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ 
          userId: user.uid,
          refresh: refresh 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Account status:`, data)
        setAccountStatus(data)
      } else {
        console.log(`❌ Account status check failed`)
        setAccountStatus({
          connected: false,
          fullySetup: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          status: "not_connected"
        })
      }
    } catch (error) {
      console.error("❌ Error checking account status:", error)
      setAccountStatus({
        connected: false,
        fullySetup: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "error"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkAccountStatus()
    }
  }, [user])

  const handleConnectStripe = async () => {
    if (!user) return

    try {
      setConnecting(true)
      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId: user.uid }),
      })
      
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect Stripe account")
      }
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error("Error connecting Stripe:", error)
    } finally {
      setConnecting(false)
    }
  }

  const getStatusBadge = () => {
    if (!accountStatus) return null

    if (!accountStatus.connected) {
      return <Badge variant="destructive">Not Connected</Badge>
    }

    if (!accountStatus.detailsSubmitted) {
      return <Badge variant="secondary">Setup Incomplete</Badge>
    }

    if (!accountStatus.chargesEnabled || !accountStatus.payoutsEnabled) {
      return <Badge variant="outline" className="border-amber-500 text-amber-500">Restricted</Badge>
    }

    if (accountStatus.fullySetup) {
      return <Badge variant="default" className="bg-green-600">Active</Badge>
    }

    return <Badge variant="outline" className="border-amber-500 text-amber-500">Setup Required</Badge>
  }

  const getRequirementsList = () => {
    if (!accountStatus?.account?.requirements) return []

    return [
      ...accountStatus.account.requirements.past_due.map(req => ({ req, urgent: true })),
      ...accountStatus.account.requirements.currently_due.map(req => ({ req, urgent: false })),
      ...accountStatus.account.requirements.pending_verification.map(req => ({ req, urgent: false })),
    ]
  }

  const formatRequirement = (req: string) => {
    const requirementMap: { [key: string]: string } = {
      'individual.ssn_last_4': 'Social Security Number (last 4 digits)',
      'individual.id_number': 'Government ID number',
      'individual.verification.document': 'Identity verification document',
      'individual.verification.additional_document': 'Additional identity document',
      'company.tax_id': 'Tax ID number',
      'company.verification.document': 'Business verification document',
      'tos_acceptance.date': 'Terms of Service acceptance',
      'tos_acceptance.ip': 'Terms acceptance IP address',
    }

    return requirementMap[req] || req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Checking account status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If account is fully set up, don't show the prompt
  if (accountStatus?.connected && accountStatus?.fullySetup) {
    return null
  }

  const requirements = getRequirementsList()
  const hasUrgentRequirements = requirements.some(r => r.urgent)

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-blue-400" />
            <div>
              <CardTitle className="text-white">Payment Account Setup</CardTitle>
              <CardDescription>Complete your Stripe account to start accepting payments</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              onClick={() => checkAccountStatus(true)}
              disabled={refreshing}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        {hasUrgentRequirements && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              <strong>Urgent:</strong> Your account has overdue requirements that must be completed immediately to continue accepting payments.
            </AlertDescription>
          </Alert>
        )}

        {!accountStatus?.connected && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              You need to connect your Stripe account to start accepting payments from customers.
            </AlertDescription>
          </Alert>
        )}

        {accountStatus?.connected && !accountStatus?.detailsSubmitted && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              Your Stripe account is connected but setup is incomplete. Complete the verification process to start accepting payments.
            </AlertDescription>
          </Alert>
        )}

        {/* Account Status Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">Account Connected</span>
            <div className="flex items-center gap-1">
              {accountStatus?.connected ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-white">{accountStatus?.connected ? "Yes" : "No"}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">Details Submitted</span>
            <div className="flex items-center gap-1">
              {accountStatus?.detailsSubmitted ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-white">{accountStatus?.detailsSubmitted ? "Yes" : "No"}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">Charges Enabled</span>
            <div className="flex items-center gap-1">
              {accountStatus?.chargesEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-white">{accountStatus?.chargesEnabled ? "Yes" : "No"}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">Payouts Enabled</span>
            <div className="flex items-center gap-1">
              {accountStatus?.payoutsEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-white">{accountStatus?.payoutsEnabled ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>

        {/* Show transfers capability if available */}
        {accountStatus?.transfersCapability && (
          <div className="p-3 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Transfers Capability</span>
              <div className="flex items-center gap-1">
                {accountStatus.transfersCapability === 'active' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-400" />
                )}
                <span className="text-white capitalize">{accountStatus.transfersCapability}</span>
              </div>
            </div>
          </div>
        )}

        {/* Requirements List */}
        {requirements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Required Information:</h4>
            <ul className="space-y-1 text-sm">
              {requirements.map(({ req, urgent }) => (
                <li key={req} className="flex items-center gap-2">
                  <AlertTriangle className={`h-3 w-3 ${urgent ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className={urgent ? 'text-red-200' : 'text-amber-200'}>
                    {formatRequirement(req)}
                  </span>
                  {urgent && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleConnectStripe}
          disabled={connecting}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              {accountStatus?.connected ? "Complete Setup with Stripe" : "Connect Stripe Account"}
            </>
          )}
        </Button>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Shield className="h-3 w-3" />
          <span>Secure connection powered by Stripe Connect</span>
        </div>
      </CardContent>
    </Card>
  )
}
